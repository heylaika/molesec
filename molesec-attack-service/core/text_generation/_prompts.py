"""Collection of prompts for text generation tasks.

Each prompt is a multi line string which newlines later get removed and <br> are made
into newlines. This is to avoid having to write the prompt as multiple strings which
is very annoying to work with in Python.


"""
email_prompt = (
    """
You are a professional copy writer that is specialized in writing emails to be exchanged
between colleagues in the same company. Write an email for me to a colleague of
mine, I'll provide parameters to control the wording and content of the email. I'll first
explain about the goal, the parameters and the content of the email, I'll also provide
examples.<br><br>

# Goal<br>
This email is to convince my colleague to act as described in my request stated
above. Note that this email shouldn't read like a phishing email. Otherwise it
could result in a false alarm. For example, instead of giving an instruction
like "click this link", ask the colleague to "check if the link works". Use the
request reason, worded in a natural manner, to explain to the colleague why I
want him/her to perform the request. If a link is to be included it means the
request will involve the colleague to click on the link in order to fullfil my
request.<br><br>

# Parameters explanation<br>
- my_name: The name of the sender of the email.<br>
- my_last_name: The last name of the sender of the email.<br>
- colleague_name: The name of the recipient of the email.<br>
- colleague_last_name: The last name of the recipient of the email.<br>
- formality_level: How formal the email should be.<br>
- urgency_level: How urgent the email is.<br>
- request_type: The type of request I want to make, i.e. what I'd like the
  recipient to do.<br>
- request_reason: The reason why I want to make the request, i.e. why I want
  the recipient to do it.<br>
- request_length: How long the email should be.<br>
- include_link: Whether the email should include a link or not. When True,
  the email should include a link placeholder of the form of "[link_for_user]".
  I'll take care of replacing the placeholder with a link later. When this argument
  is True assume we always want the recipient to eventually click on the link.<br>
- subject_body_divider: A string that separates the subject from the body of the email.
  Place it where appropriate.<br><br>

When a parameter is "None", empty or ends with ":", ignore it. Never include a "None" or
empty value in the email. Never bubble up a parameter into the email content, i.e. never
write something like "[my_name]" in the email.

# Content<br>

## Subject<br>

The subject should be a short one-liner, do not include the word "subject" or
anything that indicates that this is the subject, just write the subject itself.<br><br>

## Body<br>

The email should be concise, readable, and to-the-point. Use the appropriate
writing style based on the parameters. The email body should be properly
formatted into one or more paragraphs. Don't make the request sound like an
order, but a favour between colleagues. Don't make up information that isn't
plausibly inferrable by the arguments.
Never include strings that look like a template parameter, like [word], except
when required for the link_for_user and subject_body_divider parameters.
If a parameter is not included, omit it rather than coming up with a
placeholder. For example, if the "colleague_name" is not defined, don't use any placeholder
in the email body, but word the email in a way that doesn't require the name of the
recipient.<br><br>

# Format<br>
Your output should be:<br>
- a subject<br>
- a divider which separates the subject and the body, equal to the value of the
  subject_body_divider parameter.<br>
- the body. Assume this is valid html, you can use line breaks or other constructs
to separate paragraphs.<br><br>

# Examples<br><br>

## Example 1<br>
- my_name: rick<br>
- my_last_name: None<br>
- colleague_name: yannick<br>
- colleague_last_name: Perrenet<br>
- formality_level: INFORMAL<br>
- urgency_level: NORMAL<br>
- request_type: LOOK_INTO_THIS<br>
- request_reason: NOT_WORKING<br>
- request_length: SHORT<br>
- include_link: True<br>
- subject_body_divider: [divider]<br>

Output:<br>
minor thing to take a look into<br>
[divider]<br>
Hey Rick,<br><br>

could you take a quick look to see what's up with this? Doesn't seem
to be working on my end. [link_for_user]<br><br>

Best, Yannick<br><br>

## Example 2<br>
- my_name: <br>
- my_last_name: None<br>
- colleague_name: huang<br>
- colleague_last_name: None<br>
- formality_level: INFORMAL<br>
- urgency_level: NORMAL<br>
- request_type: LOOK_INTO_THIS<br>
- request_reason: NOT_WORKING<br>
- request_length: SHORT<br>
- include_link: True<br>
- subject_body_divider: [divider]<br>

Output:<br>
need a quick lookup<br>
[divider]<br>
Huang,<br><br>

Looks like something is wrong with this. Any idea what's up? [link_for_user]<br><br>

Regards,<br><br>

## Example 3<br>
- my_name: Jacopo<br>
- my_last_name: gobbi<br>
- colleague_name: Rasmus<br>
- colleague_last_name: Wennerström<br>
- formality_level: INFORMAL<br>
- urgency_level: CAN_WAIT<br>
- request_type: CLICK_LINK<br>
- request_reason: WHAT_IS_IT<br>
- request_length: SHORT<br>
- include_link: True<br>
- subject_body_divider: [divider]<br>

Output:<br>
Unknown endpoint on my end<br>
[divider]<br>
Hi Rasmus,<br><br>

Is this familiar? I'm not sure what to do here. [link_for_user]<br><br>

Much appreciated,<br>
Jacopo<br><br>

## Example 4<br>
- my_name: Nick<br>
- my_last_name: Post<br>
- colleague_name: Danique<br>
- colleague_last_name: Sipkes<br>
- formality_level: FORMAL<br>
- urgency_level: URGENT<br>
- request_type: LOOK_INTO_THIS<br>
- request_reason: NOT_WORKING<br>
- request_length: MEDIUM<br>
- include_link: True<br>
- subject_body_divider: [divider]<br>

Output:<br>
Not working, looking to get it fixed<br>
[divider]<br>
Hi Danique,<br><br>

Sorry to bother you, I've been trying to get this to work, but I can't seem to
figure it out. I'm not sure what I'm supposed to do here. I've tried everything
I can think of, but I'm not getting much out of it, I was hoping you could take
a look asap, it's a bit of an urgent matter.<br> Here's the link:
[link_for_user]<br>. Let me know if there is anything I can do to help.<br><br>

Best regards,<br>
Nick Post<br><br>

# Your task<br>
Based on the previous instructions, perform your task.
Here are the parameters:<br>
- my_name: {from_name}<br>
- my_last_name: {from_last_name}<br>
- colleague_name: {to_name}<br>
- colleague_last_name: {to_last_name}<br>
- formality_level: {formal_level}<br>
- urgency_level: {urgency_level}<br>
- request_type: {text_request_type}<br>
- request_reason: {text_request_reason}<br>
- request_length: {text_request_length}<br>
- include_link: {include_link}<br>
- subject_body_divider: {subject_body_divider}<br>
Output:<br>
""".replace(
        "\n\n", "\n"
    )
    .replace("\n", " ")
    .replace("<br> ", "<br>")
    .replace("<br>", "\n")
)
