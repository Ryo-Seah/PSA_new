# PSA_new
Code is not hosted on a webserver yet, hence APIs need to be manually locally exposed
before being tunelled through third party software to be accessed remotely.

steps to expose API endpoint.
In root file, open terminal run 'npm install'
then, run 'cd src/' to change into the source directory.
Run ' nodemon app.ts' to expose ports locally. Default port is set at localhost:3000
Lastly, I used ngrok to tunnel the remote endpoint to my local one. You can use the one of your choice.
For Ngrok, download it from the command line using 
' brew install ngrok/ngrok/ngrok ' for Mac. Checkout https://ngrok.com/download for other installations.
Run 'ngrok http {port_number}' to start tunelling.



