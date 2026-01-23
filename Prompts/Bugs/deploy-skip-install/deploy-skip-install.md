prompt: modify the deploy scripts to not use npm install if already installed, because is already installed. then retry and continue

answer: Updated deploy script to skip npm install when node_modules already exists for frontend and server.

suggestion: Re-run the deploy script to confirm it skips installs and completes.
