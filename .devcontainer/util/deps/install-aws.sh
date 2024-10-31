#!/bin/bash

# Removing yum install of AWS CLI
yum remove awscli

echo "Installing AWS CLI"
mkdir /tmp/aws_install
cd /tmp/aws_install
curl "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
rm -rf awscliv2.zip aws
cd ~