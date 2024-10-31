# Base Image from Amazon Linux latest version
FROM amazonlinux:latest

# Install necessary packages
RUN yum update -y \
    && yum install -y git sudo \
    && yum groupinstall -y "Development Tools"

# Create the /tmp/bootstrap directory and copy files
RUN mkdir -p /tmp/bootstrap
COPY util/ /tmp/bootstrap/
RUN chmod -R +x /tmp/bootstrap

# Set this as a safe git directory.
RUN git config --global --add safe.directory /workspace

# Set the PS1 variable to make it ✨fancy✨ and include the git branch.
# The command is wrapped in a shell function to ensure it evaluates correctly each time the prompt is displayed
RUN echo 'parse_git_branch() { \
    local branch="$(git branch 2>/dev/null | sed -e "/^[^*]/d" -e "s/* \(.*\)/\1/")"; \
    if [ -n "$branch" ]; then \
        echo " ($branch)"; \
    else \
        echo " (no repo found)"; \
    fi \
}' >> ~/.bashrc \
 && echo 'export PS1="\\[\\e[38;5;39m\\]\\w\\[\\e[91m\\] ➜\\[\\e[93m\\]\$(parse_git_branch)\\[\\e[0m\\] $ "' >> ~/.bashrc