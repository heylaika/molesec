# ProfileData

# Authentication
- Authorization entry in the header: `Authorization: Api-Key <API_KEY>`.

# Schema
- Go to server URL or start one locally with `python manage.py runserver`
- go to `/schema/swagger-ui/`

# Errors and API calls

The code base is setup in a way that all exceptions happening during an API
call will always follow the same schema (see `schema/swagger-ui/`). They will always
have the form of 
```json
{
	"message": "A human readable message without sensitive data, can be exposed to the user.",
	"data": {},
	"category": "High level category of the error.",
	"error_code": "Specific error code."
}
```

## Read the swagger docs

Head to `/schema/swagger-ui/` to know which payloads to expect from an endpoint. The swagger docs
provide both schema definition and examples. 

## Implementation 

Modules of interest:
- `app/middleware.py`
- `profile_data/errors.py`
- `profile_data/serializers.py`

A middleware in `app/middleware.py` intercepts all outgoing exceptions and makes sure the schema is
followed.

For all errors in `profile_data/errors.py` (descendants of `ApplicationError`), the
`VALIDATION_ERROR` and the generic `ERROR`, serializers and example payloads are programmatically
generated in `profile_data/serializers.py`. If your new error is a descendant of `ApplicationError`
you don't need to do anything. These serializers are divided in categories for ease of use in the
api module. Example payloads can be used to generate `OpenApiExample`s, like it happens in the api
module.

# Running locally and development

> **Tip:** Before starting local development, it's advised to set up
> a virtual environment for Python. We recommend using miniconda
> `conda create --name yolo python=3.9.15` then `conda activate yolo`

Gitflow, i.e. merge stuff to `dev` then merge to master to trigger a 
release.

- install dependencies (`pip install -r requirements.txt && pip install -r requirements.dev.txt`)
- install pylint, (e.g. `pip install pylint`)
- `pre-commit install`
- copy `.env-template` to a `.env` file and fill in the details. Mine looks
  like this locally:
  ```
  DB_CERT=yolo
  DB_HOST=localhost
  DB_PASSWORD=postgres
  DEBUG=True
  DJANGO_SECRET_KEY=yolo
  LOG_LEVEL=DEBUG
  ```
- Start a container for a local db
  ```
  docker run \
    --name "profile-data-dev-db" \
    -p "5433:5432" \
    -e "POSTGRES_HOST_AUTH_METHOD=trust" \
    -e "PGDATA=/var/lib/postgresql/data" \
    -v "$(pwd)/pgdata:/var/lib/postgresql/data" \
    --rm \
    -d \
    postgres:15.1
	docker exec profile-data-dev-db sh -c 'until pg_isready; do sleep 1; done'
  ```
- if it's the first time you are starting the db, you have no state (see the -v in the
  previous command)
- `python manage.py migrate`
- `python manage.py createsuperuser`
- `python manage.py runserver`
- Login at `http://127.0.0.1:8000/admin/`
- Create an API key in the admin panel if you need to use the API
- API schema at `http://127.0.0.1:8000/schema/swagger-ui/`


# Heroku application setup

Buildpacks:
- heroku buildpacks:add heroku/python
- add papertrail
- create a supabase DB and set the env variables defined in .env-template
  as heroku env variables
