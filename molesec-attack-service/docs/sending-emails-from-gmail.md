Google doesn't make it easy to sent emails from gmail programmatically.
There are 3 (2) alternatives here.


# Allow less secure apps

A gmail account could change its settings to allow less secure apps to run the account by using the
account email and password. This is no more apart from some legacy accounts or organization accounts
(no gmail).

# GCP Gmail API application

This requires to create a GCP Gmail API application, with an oauth authentication
method. Essentially, you'd be giving the application access to your gmail account by
"logging in" into the application through oauth. This is full of caveats and bad ergonomics,
I did not finish the whole setup but the main thing moving me away from this approach
is that the authentication can expire and a new login will be required.

- create a gcp project
- enable the GMAIL API (search for it)
- you get taken to the GMAIL API page, it will tell you that you can CREATE CREDENTIALS
- go for the personal data option, the oauth one
- add the openid and the "https://mail.google.com/" scope
- set the app type as webservice, setup the Authorized redirect URIs
- copy the client id and the credentials file
- go to the oauth grant page, https://console.cloud.google.com/apis/credentials/consent?project=< your project > 
- set the app as "Testing" (External "Prod" requires vetting)
- add emails to the test users
- pip install google-auth-oauthlib google-api-python-client
- run https://github.com/googleworkspace/python-samples/blob/master/gmail/quickstart/quickstart.py
  use your credentials.json file you downloaded)
- login with the account

Here is where I stopped pushing in this direction, apparently the redirect URI wasn't
okay and there is a "Note: It may take 5 minutes to a few hours for settings to take effect"
in the docs. And here's where I found out that the "login" might expire etc. Given that
some of the tokens/credentials are file based and what not this approach seemed a little
too much for now.


# App passwords

There is an escape hatch for people still needing approach 1, requirements:
- create a gmail account
- add 2FA (requires a phone number + adding the psw to the authenticator app)
	- we can "share" the 2FA authentication by storing the TTOP code rather than
	  using an authentication APP, see https://thirld.com/blog/2016/01/16/generating-two-factor-authentication-codes-on-linux/. TODO expand on this.
- go to https://myaccount.google.com/apppasswords (login with the new account)
- setup a password

You can then send the email like this
```
def send_email(to, subject, body):
    gmail_user = "user"
    gmail_password = "psw"

    message = MIMEText(body, 'html')
    message['to'] = to
    message['subject'] = subject

    server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
    server.ehlo()
    server.login(gmail_user, gmail_password)
    server.sendmail(gmail_user, to, message.as_string())
    server.close()
```

## Fetching emails
```
def retrieve_email(from_email, psw):
    import imaplib

    SMTP_SERVER = "imap.gmail.com" 
    mail = imaplib.IMAP4_SSL(SMTP_SERVER)
    mail.login(from_email,psw)
    mail.select('inbox')
    _, data = mail.search(None, 'SUBJECT', '"yolo"')
    content = mail.fetch(data[0], '(RFC822)')
    print(content)
```

# Current Implementation

Currently we have adopted "App passwords". You can find the molesec
common gmail accounts information in 1 password, under "molesec common GMAIL account 1",
etc.