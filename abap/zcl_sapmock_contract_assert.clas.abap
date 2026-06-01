CLASS zcl_sapmock_contract_assert DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    CLASS-METHODS assert_json_contains
      IMPORTING
        iv_json TYPE string
        iv_text TYPE string.
ENDCLASS.

CLASS zcl_sapmock_contract_assert IMPLEMENTATION.
  METHOD assert_json_contains.
    cl_abap_unit_assert=>assert_true(
      act = xsdbool( iv_json CS iv_text )
      msg = |Expected JSON to contain "{ iv_text }"| ).
  ENDMETHOD.
ENDCLASS.

