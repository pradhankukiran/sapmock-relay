INTERFACE zif_sapmock_backend_port
  PUBLIC.

  METHODS execute
    IMPORTING
      iv_method TYPE string
      iv_path   TYPE string
      iv_body   TYPE string OPTIONAL
    RETURNING
      VALUE(rv_response) TYPE string.
ENDINTERFACE.

