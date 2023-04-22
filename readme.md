# Code found on
https://github.com/HelmyBlub/gamedev

# public hosted / deployed to url
https://helmys-game.onrender.com/

# Development Environment Setup Steps
1. install GIT
2. install IDE. I use visual studio code
3. install browser. I use google chrome
4. install node.js and npm:
    - linux:
        - easy but old versions?
            1. `sudo apt update`
            2. `sudo apt install nodejs npm`
        - other
            1. download lts: https://nodejs.org/en
            2. install steps: https://github.com/nodejs/help/wiki/Installation
    
5. clone repo
    - `git clone https://github.com/HelmyBlub/gamedev.git`
6. install code dependencies
    - in command line, be in the path where you check out the git repo
    - `npm install`

# Start Development Environment
- `npm run dev`
- http://localhost:3000/

add outside access:
- `npm run online`
- creates an url which other can use to connect to your local environment
- it is free but has bad performance

# Docker
- build and run in docker container
    1. `docker build -t helmys-game .`
    2. `docker run -p 3000:3000 helmys-game`
