CLASS zcl_sapmock_http_client_double DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    INTERFACES zif_sapmock_backend_port.

    METHODS add_response
      IMPORTING
        iv_method   TYPE string
        iv_path     TYPE string
        iv_response TYPE string.

  PRIVATE SECTION.
    TYPES: BEGIN OF ty_response,
             key      TYPE string,
             response TYPE string,
           END OF ty_response,
           tt_response TYPE HASHED TABLE OF ty_response WITH UNIQUE KEY key.

    DATA mt_response TYPE tt_response.

    METHODS build_key
      IMPORTING iv_method TYPE string
                iv_path   TYPE string
      RETURNING VALUE(rv_key) TYPE string.
ENDCLASS.

CLASS zcl_sapmock_http_client_double IMPLEMENTATION.
  METHOD add_response.
    INSERT VALUE #( key = build_key( iv_method = iv_method iv_path = iv_path )
                    response = iv_response ) INTO TABLE mt_response.
  ENDMETHOD.

  METHOD zif_sapmock_backend_port~execute.
    READ TABLE mt_response WITH TABLE KEY key = build_key( iv_method = iv_method iv_path = iv_path )
      INTO DATA(ls_response).
    IF sy-subrc <> 0.
      rv_response = '{"error":"NO_TEST_DOUBLE_RESPONSE"}'.
      RETURN.
    ENDIF.

    rv_response = ls_response-response.
  ENDMETHOD.

  METHOD build_key.
    rv_key = to_upper( iv_method ) && ` ` && iv_path.
  ENDMETHOD.
ENDCLASS.

