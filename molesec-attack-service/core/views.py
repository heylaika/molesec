from django.shortcuts import render


def page_consuming_token_view(request):
    """Page that consumes a phishing token.

    ! PUBLICLY ACCESSIBLE.

    Given a token "at" in the query args, it will return a page that,
    when rendered, will make a request to the ConsumePhishingToken
    endpoint to consume the token.
    """
    token = request.GET.get("at", None)
    context = {"token": token}
    return render(request, "phishing/page-consuming-token.html", context)


def github_login_view(request):
    """Fake github login view.
    ! PUBLICLY ACCESSIBLE.

    If we end up with more than 1 login view (github, linkedin, etc.) we
    can differentiate through a request arg imo, since this view maps
    to the /login route which is "real" looking, i.e. we wan't to reuse
    /login fo multiple login views.
    """
    # The placeholder is used for debugging purposes.
    link_clicked_token = request.GET.get("at", "placeholder")
    credentials_token = request.GET.get("ct", "placeholder")
    context = {
        "token": link_clicked_token,
        "credentials_token": credentials_token,
    }
    return render(request, "phishing/github-login.html", context)
