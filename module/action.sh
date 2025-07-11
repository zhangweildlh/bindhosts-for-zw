#!/bin/sh
PATH=/data/adb/ap/bin:/data/adb/ksu/bin:/data/adb/magisk:$PATH
MODDIR="/data/adb/modules/bindhosts"
PERSISTENT_DIR="/data/adb/bindhosts"
. $MODDIR/mode.sh

magisk_webui_redirect=1

# action.sh
# a wrapper for bindhosts.sh

# functions
bindhosts_sh() {
	# grab start time
	start_time=$(date +%s)
	# call bindhosts.sh
	sh $MODDIR/bindhosts.sh --action
	# print exec time
	echo "[+] execution time: $(( $(date +%s) - start_time ))s"
	# 2s sleep on APatch on KernelSU
	if [ -z "$MMRL" ] && [ -z "$KSU_NEXT" ] && { [ "$KSU" = "true" ] || [ "$APATCH" = "true" ]; }; then
		sleep 2
	fi
	# exit clean
	exit 0
}

# this will happen every april fools
# 50% chance itll open a rickroll on action press
if [ "$( date +"%d%m" )" = "0104" ]; then
        ( [ "$(busybox shuf -i 1-2 -n 1)" = "1" ] && sleep 2 && {
        	if pm path tv.danmaku.bili > /dev/null 2>&1; then
			am start -a android.intent.action.VIEW -d "https://b23.tv/Qhk2xvo"
		else
	        	am start -a android.intent.action.VIEW -d "https://youtu.be/dQw4w9WgXcQ"
	        fi
        } ) &
fi

# read webui setting here
# echo "magisk_webui_redirect=0" > /data/adb/bindhosts/webui_setting.sh
[ -f $PERSISTENT_DIR/webui_setting.sh ] && . $PERSISTENT_DIR/webui_setting.sh

# detect magisk environment here
# no need to redirect if inside mmrl
if [ -z "$MMRL" ] && [ ! -z "$MAGISKTMP" ] && [ $magisk_webui_redirect = 1 ] ; then
	# courtesy of kow
	pm path io.github.a13e300.ksuwebui > /dev/null 2>&1 && {
		echo "- Launching WebUI in KSUWebUIStandalone..."
		am start -n "io.github.a13e300.ksuwebui/.WebUIActivity" -e id "bindhosts"
		exit 0
	}
	pm path com.dergoogler.mmrl.wx > /dev/null 2>&1 && {
		echo "- Launching WebUI in WebUI X..."
		am start -n "com.dergoogler.mmrl.wx/.ui.activity.webui.WebUIActivity" -e MOD_ID "bindhosts"
		exit 0
	}
fi
bindhosts_sh

# EOF
