#!/bin/bash

# Update the package list
yum update -y

# Install Python 3 and pip
yum install -y python3 python3-devel python3-pip

# Verify the installation
python3 --version
pip3 --version