#!/usr/bin/env bash
# Colector de estado del VPS. SOLO LECTURA: no escribe, no borra, no cambia nada.
# Se ejecuta vía:  ssh knowmad-claude "sudo -n bash -s" < collect.sh
# Emite bloques de texto plano delimitados por ##::SECTION::<nombre>

export LC_ALL=C
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

sec() { printf '\n##::SECTION::%s\n' "$1"; }
q()   { "$@" 2>/dev/null || true; }

WEBROOTS="/var/www"

sec meta
date -Is
hostname
( . /etc/os-release 2>/dev/null; echo "$PRETTY_NAME" )
uname -r
q uptime -p
cut -d' ' -f1-3 /proc/loadavg
[ -f /var/run/reboot-required ] && echo "REBOOT_REQUIRED=si" || echo "REBOOT_REQUIRED=no"
printf 'UPTIME_S=%s\n' "$(cut -d. -f1 /proc/uptime)"

sec disk
q df -PhT -x tmpfs -x devtmpfs -x squashfs -x overlay

sec inodes
q df -Pi -x tmpfs -x devtmpfs -x squashfs -x overlay

sec du_root
q du -x --max-depth=1 -m / | sort -rn | head -14

sec du_homes
q du -x --max-depth=2 -m /home | sort -rn | head -22

sec mem
q free -m

PM2_SLIM='[.[] | {name, pm_id, status: .pm2_env.status, cpu: .monit.cpu,
  mem_mb: ((.monit.memory // 0) / 1048576 | floor), restarts: .pm2_env.restart_time,
  uptime_ms: .pm2_env.pm_uptime, user: .pm2_env.username, cwd: .pm2_env.pm_cwd,
  script: .pm2_env.pm_exec_path, interp: .pm2_env.exec_interpreter,
  port: (.pm2_env.env.PORT // .pm2_env.PORT // null)}]'

sec pm2
q runuser -l claude -c 'pm2 jlist' | tail -1 | q jq -c "$PM2_SLIM"

sec pm2_arcack
q runuser -l arcack -c 'pm2 jlist' | tail -1 | q jq -c "$PM2_SLIM"

sec services_running
q systemctl list-units --type=service --state=running --no-legend --no-pager --plain

sec units_local
q ls -l --time-style=long-iso /etc/systemd/system/*.service

sec ports
q ss -tulpnH

sec established
q ss -tunpH state established

sec ufw
q ufw status verbose

sec sshd
q sshd -T | grep -E '^(port|listenaddress|permitrootlogin|passwordauthentication|pubkeyauthentication|permitemptypasswords|kbdinteractiveauthentication|x11forwarding|maxauthtries)'

sec ssh_accept_agg
q journalctl -u ssh --since '-30 days' --no-pager | grep -oE 'Accepted [a-z]+ for [^ ]+ from [0-9a-fA-F.:]+' | sort | uniq -c | sort -rn

sec ssh_accept_recent
q journalctl -u ssh --since '-30 days' --no-pager | grep 'Accepted' | tail -12

sec ssh_failed
printf 'FAILED=%s\n' "$(q journalctl -u ssh --since '-30 days' --no-pager | grep -c 'Failed password')"
printf 'INVALID=%s\n' "$(q journalctl -u ssh --since '-30 days' --no-pager | grep -c 'Invalid user')"
q journalctl -u ssh --since '-30 days' --no-pager | grep -E 'Failed password|Invalid user' | tail -8

sec sudo_recent
q journalctl --since '-7 days' --no-pager _COMM=sudo | grep -oE 'USER=[^ ]+ ; COMMAND=.*' | sort | uniq -c | sort -rn | head -15

sec account_changes
q journalctl --since '-30 days' --no-pager | grep -aoE '(new user|new group|useradd|usermod|userdel|groupadd)[^"]{0,90}' | tail -15

sec who
q who

sec users
awk -F: '$3>=1000 && $7 !~ /nologin|false/ {print $1" uid="$3" shell="$7}' /etc/passwd
awk -F: '$3==0 {print $1" uid=0 shell="$7}' /etc/passwd

sec groups_priv
q getent group sudo
q getent group adm
q getent group docker

sec authkeys
for h in /root /home/*; do
  f="$h/.ssh/authorized_keys"
  if [ -f "$f" ]; then
    while read -r line; do
      [ -n "$line" ] && echo "$f :: $line"
    done < <(q ssh-keygen -lf "$f")
  fi
done

sec sudoers
q grep -rhE '^[^#]*NOPASSWD' /etc/sudoers /etc/sudoers.d/ 2>/dev/null

sec cron
for u in $(cut -d: -f1 /etc/passwd); do
  out=$(q crontab -u "$u" -l | grep -vE '^\s*#|^\s*$')
  [ -n "$out" ] && echo "[$u] $out"
done
echo "--- /etc/crontab ---"
q grep -vE '^\s*#|^\s*$' /etc/crontab
echo "--- /etc/cron.d ---"
q ls -1 /etc/cron.d
echo "--- timers ---"
# Solo el nombre de la unidad: las horas de próxima ejecución cambian en cada
# captura y ensuciarían la comparación entre capturas.
q systemctl list-timers --all --no-legend --no-pager --plain | awk 'NF>2 {print $(NF-1)" -> "$NF}' | sort

sec nginx_sites
q ls -l --time-style=long-iso /etc/nginx/sites-enabled/

sec nginx_conf
q grep -RhE 'server_name|root |proxy_pass|listen ' /etc/nginx/sites-enabled/ | sed 's/^[ \t]*//' | grep -v '^#' | sort -u

sec web_fingerprint
if [ -d "$WEBROOTS" ]; then
  printf 'FILES=%s\n' "$(q find $WEBROOTS -type f | wc -l)"
  printf 'BYTES=%s\n' "$(q du -sb $WEBROOTS | cut -f1)"
  printf 'HASH=%s\n' "$(q find $WEBROOTS -type f -printf '%p|%s|%T@\n' | sort | sha256sum | cut -c1-16)"
fi

sec web_recent
q find $WEBROOTS -type f -newermt '-14 days' -printf '%TY-%Tm-%Td %TH:%TM  %10s  %p\n' | sort -r | head -30

sec web_suspicious
q find $WEBROOTS -type f \( -name '*.php' -o -name '*.cgi' -o -name '*.pl' -o -name '*.sh' \) -printf '%TY-%Tm-%Td  %p\n' | head -20
q find $WEBROOTS -type d -perm -0002 -printf 'WORLD_WRITABLE_DIR %p\n' | head -10

sec tmp_exec
q find /tmp /var/tmp /dev/shm -maxdepth 3 -type f \( -perm -u+x -o -name '*.sh' -o -name '*.py' -o -name '*.elf' \) -printf '%TY-%Tm-%Td  %10s  %p\n' | head -20

sec proc_deleted
q ls -l /proc/*/exe 2>/dev/null | grep -i 'deleted' | head -10

sec proc_top
q ps -eo user,pid,pcpu,pmem,etimes,comm --sort=-pcpu | head -12

sec suid
q find / -xdev -perm -4000 -type f | sort

sec integrity
for f in /etc/passwd /etc/shadow /etc/group /etc/sudoers /etc/ssh/sshd_config /etc/crontab /etc/hosts /root/.ssh/authorized_keys /home/claude/.ssh/authorized_keys /home/arcack/.ssh/authorized_keys; do
  if [ -f "$f" ]; then
    printf '%s  %s  %s\n' "$(q sha256sum "$f" | cut -c1-16)" "$(q stat -c '%y' "$f" | cut -c1-16)" "$f"
  fi
done

sec updates
if [ -x /usr/lib/update-notifier/apt-check ]; then
  printf 'APT_CHECK=%s\n' "$(/usr/lib/update-notifier/apt-check 2>&1)"
fi
printf 'UNATTENDED=%s\n' "$(q systemctl is-enabled unattended-upgrades)"

sec tailscale
q tailscale status
echo "--- serve ---"
q tailscale serve status

sec listen_check
# Comprobación real de exposición: qué responde desde fuera de Tailscale
printf 'PUBLIC_IP=%s\n' "$(q ip -4 -o addr show scope global | awk '{print $4}' | cut -d/ -f1 | head -1)"

sec end
echo OK
