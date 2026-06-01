CLASS zcl_sapmock_bapi_return DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    TYPES: BEGIN OF ty_bapiret,
             type    TYPE c LENGTH 1,
             id      TYPE c LENGTH 20,
             number  TYPE c LENGTH 3,
             message TYPE string,
           END OF ty_bapiret,
           tt_bapiret TYPE STANDARD TABLE OF ty_bapiret WITH EMPTY KEY.

    CLASS-METHODS success
      IMPORTING iv_message TYPE string DEFAULT 'OK'
      RETURNING VALUE(rt_return) TYPE tt_bapiret.

    CLASS-METHODS error
      IMPORTING iv_id TYPE csequence DEFAULT 'ZSMOCK'
                iv_number TYPE csequence DEFAULT '001'
                iv_message TYPE string
      RETURNING VALUE(rt_return) TYPE tt_bapiret.
ENDCLASS.

CLASS zcl_sapmock_bapi_return IMPLEMENTATION.
  METHOD success.
    rt_return = VALUE #( ( type = 'S' id = 'ZSMOCK' number = '000' message = iv_message ) ).
  ENDMETHOD.

  METHOD error.
    rt_return = VALUE #( ( type = 'E' id = iv_id number = iv_number message = iv_message ) ).
  ENDMETHOD.
ENDCLASS.

