#!/bin/sh
# 从GitHub520(https://github.com/521xueweihan/GitHub520?tab=readme-ov-file#github520)，获取GitHub最新镜像IP

_hosts_file_1=/data/adb/bindhosts/custom_github.txt
_hosts_file_2="/data/adb/modules/bindhosts/system/etc/hosts"
# 用于sed命令删除旧的镜像IP
_reg='/# GitHub520 Host Start/,/# GitHub520 Host End/d'
# 获取到最新的镜像IP
remote=https://raw.hellogithub.com/hosts

# 构造日志记录函数
log() {
# 定义日志文件，即面具Magisk日志
    LOG_FILE="/data/cache/magisk.log"
# 日志文件不可写，则退出log函数；不需要新建
    [ ! -w "$LOG_FILE" ] && return 1

    local level="$1"    # 日志级别 (I, W, E等)
    local message="$2"  # 日志内容

    # 获取当前时间 (MM-dd HH:mm:ss.SSS)
    local timestamp=$(date "+%m-%d %H:%M:%S.%3N")

    # 获取进程ID (PID) 和线程ID (TID)
    local pid=$$
    local tid=$$

    # 构造格式化的日志条目
    local log_entry=$(printf "%s  %5d  %5d %s : %s" "$timestamp" "$pid" "$tid" "$level" "$message")

    # 日志文件写入
    echo "$log_entry" >> "$LOG_FILE"
}

# 构造download函数
# 优先使用curl（支持HTTPS），无curl则用wget
download() {
  local url=$1
  local filename=$2
  local ret=0

# 删除旧GitHub镜像IP
  sed -i "$_reg" "$filename" >/dev/null 2>&1

  if command -v curl >/dev/null 2>&1; then
    curl --connect-timeout 30 -Ls "$url" -o "$filename" 2>/dev/null  # -L跟随重定向，-s静默模式
    ret=$?
    [ $ret -eq 0 ] && log "I" "curl 命令下载 $url 成功" || log "E" "curl 命令下载失败😭"
  else
    busybox wget -T 30 --no-check-certificate -qO "$filename" "$url" 2>/dev/null
    ret=$?
    [ $ret -eq 0 ] && log "I" "wget 命令下载 $url 成功" || log "E" "wget 命令下载失败😭"
  fi
  return $ret
}

# 主程序
log "I" "开始执行 git_github_hosts.sh 脚本，拟获取 GitHub 最新镜像IP，并写入 Host 文件"
ret=0
touch "$_hosts_file_1" >/dev/null 2>&1  # 创建$_hosts_file_1文件，为下一步做准备
chmod 664 $_hosts_file_1 >/dev/null 2>&1
if [ -w "$_hosts_file_1" ]; then
  download "$remote" "$_hosts_file_1"
  ret=$?
else
  log "E" "Bindhosts面具模块的 $_hosts_file_1 文件无写入权限😭"
  exit 1
fi

# 读取模块中/data/adb/modules/bindhosts/system/etc/hosts文件，检查是否 GitHub 镜像IP

github_pattern="github.com"
gitHub_update_time=""
base_time=""
start_time=""
mtime=""
time_diff=""
current_time=""
elapsed_time=""
count=""

# 使用 sed 提取时间戳
gitHub_update_time=$(sed -n 's/.*# Update time: \([0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}T[0-9]\{2\}:[0-9]\{2\}:[0-9]\{2\}+[0-9]\{2\}:[0-9]\{2\}\).*/\1/p' "$_hosts_file_1" 2>/dev/null | head -n1)
if [ -n "$gitHub_update_time" ]; then
  log "I" "Bindhosts面具模块的custom_github.txt文件中存在 GitHub 镜像IP；时间戳：$gitHub_update_time"
else
  log "E" "Bindhosts面具模块的custom_github.txt文件没有 GitHub 镜像IP😭"
  exit 1
fi

# 检查Hosts文件中是否有"github.com"
# 获取初始基准时间（秒级时间戳）
base_time=$(date +%s)
# 等待30秒后开始检测
sleep 30
# 记录循环开始时间（用于超时检测）
start_time=$(date +%s)
# 超时时间设置（10分钟=600秒）
time_out=600

# 循环检测Hosts文件更新时间
while true; do
  mtime=$(date -r "$_hosts_file_2" +%s 2>/dev/null)
  if [ -z "$mtime" ]; then
     log "E" "无法获取 $_hosts_file_2 文件修改时间，等待2秒"
     sleep 2
     continue
  fi
  time_diff=$((mtime - base_time))
  # 检测更新条件：修改时间晚于基准时间1秒~600秒（$time_out，600秒=10分钟）
  if [ "$time_diff" -ge 1 ] && [ "$time_diff" -le "$time_out" ]; then
     count=$(grep -io "$github_pattern" "$_hosts_file_2" | wc -l 2>/dev/null)
     if [ "$count" -gt 5 ]; then  # 有5个 github.com 字符串即认为有 GitHub 镜像IP
        log "I" "Bindhosts面具模块的Hosts文件已更新，且有 GitHub 镜像IP"
        exit 0
     else
        log "W" "Bindhosts面具模块的Hosts文件已更新，但没有 GitHub 镜像IP😭"
        exit 2
     fi
  fi
  # 超时检测（$time_out，600秒=10分钟）
  # 计算已运行时间（用于超时检测）
  current_time=$(date +%s)
  elapsed_time=$((current_time - start_time))
  if [ "$elapsed_time" -ge "$time_out" ]; then
     log "E" "Bindhosts面具模块的Hosts文件没有更新😭"
     exit 3
  fi
  # 每5秒检查一次
  sleep 5
done