# ABAP Usage

SAPMock Relay does not replace ABAP tests. It gives ABAP wrapper code stable payloads and repeatable failure scenarios.

Recommended ABAP shape:

```text
ZCL_QM_NOTIFICATION_API
  -> depends on ZIF_SAPMOCK_BACKEND_PORT
  -> production impl calls HTTP/RFC/facade
  -> test impl uses ZCL_SAPMOCK_HTTP_CLIENT_DOUBLE
```

Example test idea:

```abap
DATA(lo_double) = NEW zcl_sapmock_http_client_double( ).
lo_double->add_response(
  iv_method = 'GET'
  iv_path = '/qm/notifications/10000042'
  iv_response = '{"notificationId":"10000042","status":"OPEN"}' ).

DATA(lv_json) = lo_double->zif_sapmock_backend_port~execute(
  iv_method = 'GET'
  iv_path = '/qm/notifications/10000042' ).

zcl_sapmock_contract_assert=>assert_json_contains(
  iv_json = lv_json
  iv_text = '"status":"OPEN"' ).
```

Generate one ABAP Unit class per contract:

```bash
pnpm cli abap-tests examples/supplier-portal --out-dir tmp/abap-tests
```

Generated classes:

- use `zcl_sapmock_http_client_double`
- load scenario JSON as response payloads
- assert required response fields from contract schemas
- keep each contract in its own ABAP test class
