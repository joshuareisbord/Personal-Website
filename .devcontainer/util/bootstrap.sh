# !/bin/bash

# Installing AWS CLI
/tmp/bootstrap/deps/install-aws.sh

# Installing the Python Dependency
/tmp/bootstrap/deps/install-python.sh

# Installing Node and NPM
source /tmp/bootstrap/deps/install-nvm.sh # source to make sure its avaliable.
/tmp/bootstrap/deps/install-amplify.sh

echo -e "\033[1;94m
**************************************************
* WARNING:                                      *
* Please close all current bash shells and      *
* reopen them to apply the changes.             *
**************************************************
\033[0m"

exit 0
