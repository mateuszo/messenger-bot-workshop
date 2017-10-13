# devcamp bot workshop
This repository contains materials for bot workshop at [devcamp](http://devcamp.pl/). It's based mainly on [Messenger Platform Quick Start Guide](https://developers.facebook.com/docs/messenger-platform/getting-started/quick-start)

## Introduction

Some inspirations: https://poncho.is/, KLM etc.

You don't have to write code: Chatfuel etc.


## The Workshop
In this section you'll find steps that should be during the workshop.

### 1. Get familiar with [Express](https://expressjs.com/)
Create a node project:  
`npm init`

Install Express:  
`npm install express --save`

Create your first Express app (from [expressjs.com](https://expressjs.com/en/starter/hello-world.html)):
```javascript
const express = require('express')
const app = express()

app.get('/', function (req, res) {
  res.send('Hello World!')
})

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})
```
Start your app:  
`node index.js`

Navigate to: http://localhost:3000/

### 2. Don't reload your app
Use [nodemon](https://nodemon.io/):  
`npm install -g nodemon`

Start your app:  
`nodemon index.js`

### 3. Expose your app to the world
Download and install ngrok
https://ngrok.com/download

Start tunneling:  
`ngrok 3000`

### 4. Create a facebook page
Facebook page will represent your bot. Create it here: https://www.facebook.com/pages/create

### 5. Create a facebook app
1. Go to: https://developers.facebook.com/apps
2. Click _+ Add a New App_ button
3. Select _Messenger_ product - click _Set Up_

### 6. Setup webhook
A webhook is an address towards which Messenger Platform will forward messages.

First you have to create a route in your Express app:
```javascript
app.get('/webhook', function(req, res) {
  ...
});
```
This route will be used to verify our app. Use the code below. Remember to set your own `VERIFY_TOKEN`.
```javascript
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === <VERIFY_TOKEN>) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);          
  }  
});
```

Now go to your facebook app and click _Setup Webhooks_.  
Paste your ngrok address into _Callback URL_ field.  
Paste in your `VERIFY_TOKEN`.  
Select _messages_ and _messaging postbacks_ checkboxes.  
Click _Verify and Save_ button.

### 7. Subscribe to the page
Go to _Token Generation_ section on your facebook app page.  
Select your page and generate the token.  
Accept the permission request.

Go to _Webhooks_ section. Select the page that you've created before and click _Subscribe_.

Now all the messages sent to your page will be forwarded to your webhook.

### 8. Receive messages in your code
To catch the message we have to handle a POST request.
```javascript
app.post('/webhook', function (req, res) {
  var data = req.body;
  console.log(data);
  // You must send back a 200, within 20 seconds, to let us know
  // you've successfully received the callback. Otherwise, the request
  // will time out and we will keep trying to resend.
  res.sendStatus(200);
});
```

In order to see anything useful in our console we have to add a `body-parser`. Add the following code at the beginning of your app:
```javascript
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
```
Now open Messenger, find your page and send a message to it. Check out your console.  
As you can see messages are sent in JSON format. Ngrok has a web interface that will help us examine this format. Please open it, it's probably here: http://127.0.0.1:4040

### 9. Parse the message
Now when we've got familiar with the message format we can parse it. Use the following code:
```javascript
app.post('/webhook', function (req, res) {
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object === 'page') {

    // Iterate over each entry - there may be multiple if batched
    data.entry.forEach(function(entry) {
      var pageID = entry.id;
      var timeOfEvent = entry.time;

      // Iterate over each messaging event
      entry.messaging.forEach(function(event) {
        if (event.message) {
          receivedMessage(event);
        } else {
          console.log("Webhook received unknown event: ", event);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know
    // you've successfully received the callback. Otherwise, the request
    // will time out and we will keep trying to resend.
    res.sendStatus(200);
  }
});

function receivedMessage(event) {
  // Putting a stub for now, we'll expand it in the following steps
  console.log("Message data: ", event.message);
}
```

### 10. Echo the message
What we'd like to do now is answer the message. Messages are sent by sending a POST request to the facebook API. Let's implement a function that we'll comunicate with this API.

First we have to install request module.  
`npm i request --save`

Let's import it into our project:
```javascript
const request = require('request');
```

Let's use it:
```javascript
function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent generic message with id %s to recipient %s",
        messageId, recipientId);
    } else {
      console.error("Unable to send message.");
      console.error(response);
      console.error(error);
    }
  });  
}
```

Now we have to generate a `PAGE_ACCESS_TOKEN`.  
Go to _Token Generation_ section on your facebook app page.  
Select your page and generate the token.  
Copy it and paste into your code.

Now we can use our callSendAPI function:
```javascript
function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:",
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var messageId = message.mid;

  var messageText = message.text;
  var messageAttachments = message.attachments;

  echo(senderID, messageText);
}

function echo(recipientId, messageText){
  // Construct reply message
  var echo = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };

  callSendAPI(echo);
}
```

### 11. Send Structured Messages
Cool, we're able to talk with our bot! Now let's make this conversation more interactive.

Let's add `sendStructuredMessage` function:
```javascript
function sendStructuredMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "Codecool",
            subtitle: "The best programming school",
            item_url: "https://codecool.pl/",
            image_url: "https://crossweb.pl/job/wp-content/uploads/2016/06/codecool.png",
            buttons: [{
              type: "web_url",
              url: "https://codecool.pl/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback One", // button text
              payload: "Payload for first bubble", // postback body
            }],
          }, {
            title: "DevCamp",
            subtitle: "The best IT event",
            item_url: "http://devcamp.pl/",
            image_url: "https://d1ll4kxfi4ofbm.cloudfront.net/images/621921/3af0f2b904c54475f17a7919b166e900.png",
            buttons: [{
              type: "web_url",
              url: "http://devcamp.pl/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback Two",
              payload: "Payload for second bubble",
            }]
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}
```

Now let's call it. Modify `receivedMessage` function this way:
```javascript
function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:",
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var messageId = message.mid;

  var messageText = message.text;
  var messageAttachments = message.attachments;


  if(messageText=='magic'){
    sendStructuredMessage(senderID);
  } else {
    echo(senderID, messageText);
  }

}
```

Send _magic_ message to your bot and see what happens.


## Resources
Messenger Platform Docs: https://developers.facebook.com/docs/messenger-platform  
Express JS: https://expressjs.com/  
Nodemon: https://nodemon.io/  
ngrok: https://ngrok.com/  

## Furhter Reading
- [The Bot UI](https://medium.com/@Codecool/the-bot-ui-cca817e1ca08)
- [The Complete Beginner’s Guide To Chatbots](https://chatbotsmagazine.com/the-complete-beginner-s-guide-to-chatbots-8280b7b906ca)
- [Messenger Platform Docs](https://developers.facebook.com/docs/messenger-platform)
- [Chatbot Platforms Comparison](https://chatbotsjournal.com/25-chatbot-platforms-a-comparative-table-aeefc932eaff)
- [Very simple messenger bot framework](https://github.com/kinni/fb-bot-framework)

## Authors
[Mateusz Ostafil](https://www.linkedin.com/in/mostafil/) - Mentor/Developer @ [Codecool](https://codecool.pl/)
