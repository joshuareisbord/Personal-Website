# Remove /tmp/bootstrap/ directory if it exists
if [ -d "/tmp/bootstrap/" ]; then
    rm -rf /tmp/bootstrap/
    echo "Removed /tmp/bootstrap/ directory and its contents."
else
    echo "/tmp/bootstrap/ directory does not exist."
    exit 1
fi

echo -e "\033[1;94m
**************************************************
* WARNING:                                      *
* Please close all current bash shells and      *
* reopen them to apply the changes.             *
**************************************************
\033[0m"