FROM node:20-alpine3.18

# Install necessary packages
RUN apk add --no-cache git bash openjdk11-jre

# Install npm packages
RUN npm install -g typescript ts-node
RUN npm install -g firebase firebase-tools

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