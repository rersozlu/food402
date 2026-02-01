# Fetch User's Addresses

## Request

```
URL:            https://tr.fd-api.com/api/v5/customers/addresses
Method:         GET
Status Code:    200 OK
Remote Address: 104.16.102.62:443
```

## Request Headers

```
:authority:       tr.fd-api.com
:method:          GET
:path:            /api/v5/customers/addresses
:scheme:          https
accept:           application/json
accept-encoding:  gzip, deflate, br, zstd
accept-language:  tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7
authorization:    Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6ImtleW1ha2VyLWtleS12b2xvLXlzLXRyIiwidHlwIjoiSldUIn0...
origin:           https://www.yemeksepeti.com
perseus-client-id:  1769859586315.160364409902878977.3mozn6r36q
perseus-session-id: 1769901007856.351866333624167968.kfuiw5u2t6
priority:         u=1, i
referer:          https://www.yemeksepeti.com/
sec-ch-ua:        "Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"
sec-ch-ua-mobile: ?0
sec-ch-ua-platform: "macOS"
sec-fetch-dest:   empty
sec-fetch-mode:   cors
sec-fetch-site:   cross-site
user-agent:       Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36
x-fp-api-key:     volo
```

## Response

```json
{
  "data": {
    "items": [
      {
        "id": 184366924,
        "city_id": 34,
        "city": "İstanbul",
        "city_name": null,
        "area_id": null,
        "areas": null,
        "address_line1": "Dereboyu Caddesi",
        "address_line2": "Sokak numarasi",
        "address_line3": "Esentepe",
        "address_line4": "İstanbul",
        "address_line5": null,
        "address_other": null,
        "room": null,
        "flat_number": null,
        "structure": null,
        "building": "Apartman",
        "intercom": null,
        "entrance": "Daire",
        "floor": "Kat",
        "district": null,
        "postcode": "34394",
        "meta": "{\"dynamic_fields\":{\"address_line2\":{\"source\":\"user\"}},\"locale\":\"tr_TR\",\"provider\":\"here\"}",
        "company": "Sirket",
        "longitude": 29.01135496,
        "latitude": 41.07637318,
        "is_delivery_available": true,
        "formatted_customer_address": "Esentepe, Dereboyu Caddesi, Sokak numarasi, 34394 İstanbul İstanbul",
        "delivery_instructions": "Kuryeye not",
        "title": null,
        "type": 0,
        "label": null,
        "formatted_address": null,
        "is_same_as_requested_location": null,
        "campus": null,
        "corporate_reference_id": null,
        "form_id": "mi374wz5lr14",
        "country_code": "TR",
        "country_iso": "TR",
        "created_at": "2026-01-31T12:44:57Z",
        "updated_at": "2026-01-31T12:49:57Z",
        "phone_number": "+905356437070",
        "phone_country_code": "+90",
        "block": null,
        "property_type": null,
        "place_name": null,
        "landmark": null,
        "meeting_point": null,
        "door_code": null,
        "free_text_address": null,
        "gate": null,
        "entrance_picture": null,
        "hyperlocal_fields": "{\"apartment_floor\":\"Kat\",\"hotel_floor\":\"Kat\",\"hyperlocal_building\":\"Apartman\",\"office_company\":\"Sirket\",\"office_floor\":\"Kat\"}",
        "entrance_latitude": null,
        "entrance_longitude": null
      },
      {
        "id": 184367465,
        "city_id": 26,
        "city": "Eskişehir",
        "city_name": null,
        "area_id": null,
        "areas": null,
        "address_line1": "Arifiye Mahallesi",
        "address_line2": "İki Eylül Caddesi",
        "address_line3": "Tepebaşı",
        "address_line4": "Eskişehir",
        "address_line5": null,
        "address_other": null,
        "room": null,
        "flat_number": null,
        "structure": null,
        "building": "Apartman",
        "intercom": null,
        "entrance": "Daire",
        "floor": "Kat",
        "district": null,
        "postcode": "26130",
        "meta": "{\"dynamic_fields\":{\"address_line2\":{\"source\":\"user\"}},\"locale\":\"tr_TR\",\"provider\":\"here\"}",
        "company": "Şirket",
        "longitude": 30.520556,
        "latitude": 39.776667,
        "is_delivery_available": true,
        "formatted_customer_address": "Tepebaşı, Arifiye Mahallesi, İki Eylül Caddesi, 26130 Eskişehir Eskişehir",
        "delivery_instructions": "Kuryeye not",
        "title": null,
        "type": 1,
        "label": "Home",
        "formatted_address": null,
        "is_same_as_requested_location": null,
        "campus": null,
        "corporate_reference_id": null,
        "form_id": "mi374wz5lr14",
        "country_code": "TR",
        "country_iso": "TR",
        "created_at": "2026-01-31T12:49:57Z",
        "updated_at": "2026-01-31T12:49:57Z",
        "phone_number": "+905356437070",
        "phone_country_code": "+90",
        "block": null,
        "property_type": null,
        "place_name": null,
        "landmark": null,
        "meeting_point": null,
        "door_code": null,
        "free_text_address": null,
        "gate": null,
        "entrance_picture": null,
        "hyperlocal_fields": "{\"apartment_floor\":\"Kat\",\"hotel_floor\":\"Kat\",\"hyperlocal_building\":\"Apartman\",\"office_company\":\"Şirket\",\"office_floor\":\"Kat\"}",
        "entrance_latitude": null,
        "entrance_longitude": null
      }
    ]
  },
  "status_code": 200
}
```
