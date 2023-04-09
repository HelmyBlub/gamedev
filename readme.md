# Code found on
https://github.com/HelmyBlub/gamedev

# Setup steps
1. install GIT
2. install IDE. I use visual studio code
3. install browser. I use google chrome
4. install node.js and npm:
    - linux:
        1. `sudo apt update`
        2. `sudo apt install nodejs npm`
    
5. clone repo
    - `git clone https://github.com/HelmyBlub/gamedev.git`
6. npm install


# Development
- `npm run dev`

add outside access:
- `npm run online`

in Browser call (replace with your path):

 - file:///home/helmi/gamedev/public/index.html
 - http://localhost:8080/


# public hosted url
https://helmysgame-helmyblub.b4a.run/

# SSL Setup (WIP)
- `openssl genrsa -out key.pem`
- `openssl req -new -key key.pem -out csr.pem`
- `openssl x509 -req -days 9999 -in csr.pem -signkey key.pem -out cert.pem`
- `rm csr.pem`