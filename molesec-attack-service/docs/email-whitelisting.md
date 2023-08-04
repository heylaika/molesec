
To provide a better guarantee of delivery without being marked as spam we'll ask users (as is, who
administers the company emails) to whitelist our emails.  There are different approaches to
whitelisting, and it's better to have our users make use of all of them rather than an arbitrary
one, for the simple reason of improving chances.

# Email header whitelisting

This is about us putting a particular entry in the email headers, and the user
instructing its spam filter (be it a gmail setting, or anything else) to automatically
accept as good emails with such header.

[google workspace instructions](https://support.knowbe4.com/hc/en-us/articles/115004295208-Whitelisting-by-Email-Header-in-Google-Workspace)


Note: will hold out this approach until we know more about the IP/domain
and API based ones, we'll be working under the assumption that our users
only have google or microsoft workspaces as their email provider.

**When resuming work on this**: the header value (and possibly key) should
be customizable for each user. Perhaps part of the object/attack payload?

# Email provider control delegation

Involves the customer handing us partial control over their email provider, so that emails are
inserted by us (like if adding to a db) rather than being sent from other address to the other. The
`core/utils/emails.py` module has more details about this.

## GMail domain delegation

Create a GCP GMail APP and service, have the customer google workspace admin add a record to the
domain delegation section of the security options. The record contains the ID of our APP and the
permission scope.

- DEV client ID: `112660862929083677714`
- STAGING client ID: `103586271355672249728`
- PROD client ID: `102777760770116003761`
- required scope: `https://www.googleapis.com/auth/gmail.insert`
- add at `https://admin.google.com/ac/owl/domainwidedelegation`

Details to create the service from scratch:

- GCP -> create Project -> activate GMAIL API -> credentials -> create a service account
- get the account UNIQUE ID, download it's JSON credentials
- the JSON credentials are to be used as an env variable in this APP, see `GCP_GMAIL_SERVICE_KEY`
- have the user add the UNIQUE ID ("client id") and scope `https://www.googleapis.com/auth/gmail.insert`
  in `https://admin.google.com/ac/owl/domainwidedelegation` (`Add new`)


## M365 domain delegation

This section is only partial, it doesn't cover a working solution end to end.

Sources [1](https://support.knowbe4.com/hc/en-us/articles/203645138-Whitelisting-Data-and-Anti-Spam-Filtering-Information)

Useful for debugging [ms token decoder](https://jwt.ms/)

- go to azure -> active directory -> app registration -> register an app
- create a secret
- add a redirect URI with the value of `http://localhost:5000/getAToken`
- add permissions to request: Domain.Read.All (Delegated, Application),
User.Read.All (Delegated, Application), User.Read (Delegated),
User.ReadBasic.All (Delegated)
- in the  *Api Permissions* page make sure you have a "Grant Admin consent for <name>".
If it's not there, you are doing things with an account that won't have sufficient
permissions to grant the needed permissions
- download the quickstart web application example, add the client id and secret
to the config file, make it run on localhost by changing the argument of the
flask constructor (would otherwise run on 127.0.0.1 and the redirect URI would
not work)
- once the webserver is running locally, go to `http://localhost:5000`, login
with a microsoft account which is the admin of an arbitrary workspace (*not the same
workspace that is hosting the app*), accept the permissions requested by the app
- run the following script, which plays the role of an arbitrary service accessing
the application. This will query all users. This is where I stopped working on this and
moved to the IP & domain based whitelisting. The query was just returning users from
the organization which the application belongs to. When trying to send emails, you will
also need the following permissions Mail.ReadWrite, Mail.Send. You might
need GroupMember.Read.All and Reports.Read.All for some features.

```python
import requests
import msal

CLIENT_ID = ""
CLIENT_SECRET = ""
TENANT_ID = ""

AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"
SCOPES = "https://graph.microsoft.com/.default"
API_ENDPOINT = "https://graph.microsoft.com/v1.0/users/"

app = msal.ConfidentialClientApplication(
    CLIENT_ID, authority=AUTHORITY, client_credential=CLIENT_SECRET
)

result = app.acquire_token_for_client(scopes=SCOPES)
token = result["access_token"]

headers = {
    "Authorization": "Bearer " + token,
    "Content-Type": "application/json",
}
response = requests.get(API_ENDPOINT, headers=headers)
print(response.status_code)
# print(response.text)

for user in response.json()["value"]:
    print(user["mail"])
```

# Ip & Domain whitelisting

## Microsoft

Sources [tryriot](https://tryriot.com/setup-microsoft/), [knowb4](https://support.knowbe4.com/hc/en-us/articles/4404511190803)

These documents include approaches that are overlapping and redundant, for now I've tried to avoid
overlapping solutions for the sake of keeping things sane for our users.  The user needs to be part
of the Security Administrator role group in the Microsoft Security and the Compliance Center and the
Organization Management role group in Microsoft Exchange Online.

[advanced delivery options](https://security.microsoft.com/advanceddelivery?viewid=PhishingSimulation)
- edit
- IP: `<our IP>`
- Domain: proto-mail.com
- `github-actions.com/*`, `*.github-actions.com/*`, `github-actions.com`

[List of allowed/blocked tenants](https://security.microsoft.com/tenantAllowBlockList?viewid=SpoofItem)
- Spoofed Senders -> Add
- add `*, <our IP>` in the box
- spoof type -> external, action -> allow
- add

[safelinks](https://security.microsoft.com/safelinksv2)
- Create: set an arbitrary name and description
- Settings ([picture](https://riot-cms-images.s3.eu-west-1.amazonaws.com/safe_link_deep_settings_27b0f329c8.png))
  - WIP, can't access the safelinks feature, let's see if it's actually needed