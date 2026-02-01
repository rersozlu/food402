# List Restaurants API

## Request

| Field | Value |
|-------|-------|
| **URL** | `https://tr.fd-api.com/graphql` |
| **Method** | `POST` |
| **Status Code** | `200 OK` |
| **Remote Address** | `104.16.102.62:443` |
| **Referrer Policy** | `strict-origin-when-cross-origin` |

## Response

```json
{
  "data": {
    "vendorListingPage": {
      "components": [
        {
          "__typename": "VendorComponent",
          "vendorData": {
            "__typename": "VendorData",
            "availability": {
              "distanceInMeters": 1021,
              "isClosedDueToDisruption": false,
              "nextAvailableAt": null,
              "status": "OPEN",
              "__typename": "VendorAvailability"
            },
            "vendorBudget": {
              "budget": 2,
              "__typename": "VendorBudget"
            },
            "vendorChainData": null,
            "code": "tjp2",
            "isFavoriteVendor": false,
            "isSuperVendor": false,
            "name": "Öz Bereket Döner",
            "timeEstimations": {
              "delivery": {
                "duration": {
                  "upperLimitInMinutes": 20,
                  "lowerLimitInMinutes": 5,
                  "__typename": "TimeEstimationDuration"
                },
                "minimumTime": null,
                "__typename": "TimeEstimation"
              },
              "pickup": null,
              "__typename": "TimeEstimations"
            },
            "timezone": "Europe/Istanbul",
            "resolutionFallback": {
              "minimumDeliveryTime": 0,
              "pricing": {
                "deliveryFee": 0,
                "minimumOrderValue": 0,
                "__typename": "VendorAvailabilityPricingFallbacks"
              },
              "__typename": "VendorAvailabilityFallbacks"
            },
            "nonCommissionRevenueInfo": null,
            "vendorRating": {
              "count": 10,
              "value": 5,
              "__typename": "VendorRating"
            },
            "verticalParent": {
              "code": "Restaurant",
              "__typename": "VerticalParent"
            },
            "verticalSegment": {
              "code": "restaurants",
              "__typename": "VerticalSegment"
            },
            "images": {
              "listing": "https://images.deliveryhero.io/image/fd-tr/LH/tjp2-listing.jpg",
              "logo": "https://images.deliveryhero.io/image/fd-tr/LH/tjp2-hero.jpg",
              "__typename": "VendorImagesData"
            },
            "deliveryProvider": "PLATFORM",
            "incentives": [
              {
                "id": "8095744",
                "__typename": "IncentiveData"
              },
              {
                "id": "dynamic-pricing:campaign-override:1058:tjp2",
                "__typename": "IncentiveData"
              }
            ],
            "urlKey": "oz-bereket-doner-tjp2",
            "dynamicPricing": {
              "deliveryFee": {
                "total": 0,
                "__typename": "DynamicPricingDeliveryFee"
              },
              "minimumOrderValue": {
                "total": 300,
                "__typename": "DynamicPricingMinimumOrderValue"
              },
              "__typename": "DynamicPricing"
            },
            "vendorTile": {
              "type": "L",
              "media": {
                "url": "https://images.deliveryhero.io/image/fd-tr/LH/tjp2-listing.jpg",
                "__typename": "Image"
              },
              "primaryTags": [
                {
                  "id": "TAG_DEAL",
                  "elements": [
                    {
                      "__typename": "VendorTileIcon",
                      "iconId": "DISCOUNT",
                      "iconDecorators": []
                    },
                    {
                      "__typename": "VendorTileText",
                      "textId": null,
                      "text": "Tüm ürünlerde %30",
                      "arguments": [],
                      "isTranslationKey": false,
                      "textDecorators": []
                    }
                  ],
                  "__typename": "VendorTileElementGroup"
                }
              ],
              "secondaryTags": [],
              "vendorInfo": [
                [
                  {
                    "id": "VENDOR_INFO_DELIVERY_TIME",
                    "elements": [
                      {
                        "__typename": "VendorTileText",
                        "textId": null,
                        "text": "NEXTGEN_RLP_VENDORTILE_DELIVERY_TIME",
                        "arguments": ["5-30"],
                        "isTranslationKey": true,
                        "textDecorators": []
                      }
                    ],
                    "__typename": "VendorTileElementGroup"
                  },
                  {
                    "id": "VENDOR_INFO_BUDGET_SIGN",
                    "elements": [
                      {
                        "__typename": "VendorTileText",
                        "textId": null,
                        "text": "₺₺",
                        "arguments": [],
                        "isTranslationKey": false,
                        "textDecorators": []
                      }
                    ],
                    "__typename": "VendorTileElementGroup"
                  },
                  {
                    "id": "VENDOR_INFO_MOV",
                    "elements": [
                      {
                        "__typename": "VendorTileText",
                        "textId": null,
                        "text": "NEXTGEN_VENDORTILE_HARD_MOV_MIN",
                        "arguments": ["300TL"],
                        "isTranslationKey": true,
                        "textDecorators": []
                      }
                    ],
                    "__typename": "VendorTileElementGroup"
                  },
                  {
                    "id": "VENDOR_INFO_CUISINES",
                    "elements": [
                      {
                        "__typename": "VendorTileText",
                        "textId": null,
                        "text": "Döner",
                        "arguments": [],
                        "isTranslationKey": false,
                        "textDecorators": []
                      }
                    ],
                    "__typename": "VendorTileElementGroup"
                  }
                ],
                [
                  {
                    "id": "VENDOR_INFO_DELIVERY_FEE",
                    "elements": [
                      {
                        "__typename": "VendorTileIcon",
                        "iconId": "RIDER",
                        "iconDecorators": []
                      },
                      {
                        "__typename": "VendorTileText",
                        "textId": null,
                        "text": "25,99TL",
                        "arguments": [],
                        "isTranslationKey": false,
                        "textDecorators": ["STRIKETHROUGH"]
                      },
                      {
                        "__typename": "VendorTileText",
                        "textId": null,
                        "text": "NEXTGEN_HVA_ACQUISITION_FD",
                        "arguments": [],
                        "isTranslationKey": true,
                        "textDecorators": ["HIGHLIGHTED"]
                      }
                    ],
                    "__typename": "VendorTileElementGroup"
                  }
                ]
              ],
              "__typename": "VendorTile"
            }
          }
        },
        {
          "__typename": "VendorComponent",
          "vendorData": {
            "__typename": "VendorData",
            "availability": {
              "distanceInMeters": 6100,
              "isClosedDueToDisruption": false,
              "nextAvailableAt": null,
              "status": "OPEN",
              "__typename": "VendorAvailability"
            },
            "vendorBudget": {
              "budget": 3,
              "__typename": "VendorBudget"
            },
            "vendorChainData": null,
            "code": "l2f5",
            "isFavoriteVendor": false,
            "isSuperVendor": false,
            "name": "Miss Profiterol",
            "timeEstimations": {
              "delivery": {
                "duration": {
                  "upperLimitInMinutes": 80,
                  "lowerLimitInMinutes": 60,
                  "__typename": "TimeEstimationDuration"
                },
                "minimumTime": null,
                "__typename": "TimeEstimation"
              },
              "pickup": null,
              "__typename": "TimeEstimations"
            },
            "timezone": "Europe/Istanbul",
            "resolutionFallback": {
              "minimumDeliveryTime": 0,
              "pricing": {
                "deliveryFee": 0,
                "minimumOrderValue": 1000,
                "__typename": "VendorAvailabilityPricingFallbacks"
              },
              "__typename": "VendorAvailabilityFallbacks"
            },
            "nonCommissionRevenueInfo": null,
            "vendorRating": {
              "count": 5,
              "value": 5,
              "__typename": "VendorRating"
            },
            "verticalParent": {
              "code": "Restaurant",
              "__typename": "VerticalParent"
            },
            "verticalSegment": {
              "code": "restaurants",
              "__typename": "VerticalSegment"
            },
            "images": {
              "listing": "https://images.deliveryhero.io/image/fd-tr/LH/l2f5-listing.jpg",
              "logo": "https://images.deliveryhero.io/image/fd-tr/LH/l2f5-hero.jpg",
              "__typename": "VendorImagesData"
            },
            "deliveryProvider": "VENDOR",
            "incentives": [],
            "urlKey": "miss-profiterol",
            "dynamicPricing": {
              "deliveryFee": {
                "total": 0,
                "__typename": "DynamicPricingDeliveryFee"
              },
              "minimumOrderValue": {
                "total": 1000,
                "__typename": "DynamicPricingMinimumOrderValue"
              },
              "__typename": "DynamicPricing"
            },
            "vendorTile": {
              "type": "L",
              "media": {
                "url": "https://images.deliveryhero.io/image/fd-tr/LH/l2f5-listing.jpg",
                "__typename": "Image"
              },
              "primaryTags": null,
              "secondaryTags": [],
              "vendorInfo": [
                [
                  {
                    "id": "VENDOR_INFO_DELIVERY_TIME",
                    "elements": [
                      {
                        "__typename": "VendorTileText",
                        "textId": null,
                        "text": "NEXTGEN_RLP_VENDORTILE_DELIVERY_TIME",
                        "arguments": ["60-90"],
                        "isTranslationKey": true,
                        "textDecorators": []
                      }
                    ],
                    "__typename": "VendorTileElementGroup"
                  },
                  {
                    "id": "VENDOR_INFO_BUDGET_SIGN",
                    "elements": [
                      {
                        "__typename": "VendorTileText",
                        "textId": null,
                        "text": "₺₺₺",
                        "arguments": [],
                        "isTranslationKey": false,
                        "textDecorators": []
                      }
                    ],
                    "__typename": "VendorTileElementGroup"
                  },
                  {
                    "id": "VENDOR_INFO_MOV",
                    "elements": [
                      {
                        "__typename": "VendorTileText",
                        "textId": null,
                        "text": "NEXTGEN_VENDORTILE_HARD_MOV_MIN",
                        "arguments": ["1.000TL"],
                        "isTranslationKey": true,
                        "textDecorators": []
                      }
                    ],
                    "__typename": "VendorTileElementGroup"
                  },
                  {
                    "id": "VENDOR_INFO_CUISINES",
                    "elements": [
                      {
                        "__typename": "VendorTileText",
                        "textId": null,
                        "text": "Tatlı",
                        "arguments": [],
                        "isTranslationKey": false,
                        "textDecorators": []
                      }
                    ],
                    "__typename": "VendorTileElementGroup"
                  }
                ],
                [
                  {
                    "id": "VENDOR_INFO_DELIVERY_FEE",
                    "elements": [
                      {
                        "__typename": "VendorTileIcon",
                        "iconId": "RIDER",
                        "iconDecorators": ["HIGHLIGHTED"]
                      },
                      {
                        "__typename": "VendorTileText",
                        "textId": null,
                        "text": "NEXTGEN_WEB_VENDORTILE_TAG_FREE",
                        "arguments": [],
                        "isTranslationKey": true,
                        "textDecorators": ["HIGHLIGHTED"]
                      }
                    ],
                    "__typename": "VendorTileElementGroup"
                  }
                ]
              ],
              "__typename": "VendorTile"
            }
          }
        },
        {
          "__typename": "VendorComponent",
          "vendorData": {
            "__typename": "VendorData",
            "availability": {
              "distanceInMeters": 1020,
              "isClosedDueToDisruption": false,
              "nextAvailableAt": null,
              "status": "OPEN",
              "__typename": "VendorAvailability"
            },
            "vendorBudget": {
              "budget": 2,
              "__typename": "VendorBudget"
            },
            "vendorChainData": null,
            "code": "m5nm",
            "isFavoriteVendor": false,
            "isSuperVendor": false,
            "name": "Aile Kebap & Dürüm",
            "timeEstimations": {
              "delivery": {
                "duration": {
                  "upperLimitInMinutes": 20,
                  "lowerLimitInMinutes": 5,
                  "__typename": "TimeEstimationDuration"
                },
                "minimumTime": null,
                "__typename": "TimeEstimation"
              },
              "pickup": null,
              "__typename": "TimeEstimations"
            },
            "timezone": "Europe/Istanbul",
            "resolutionFallback": {
              "minimumDeliveryTime": 0,
              "pricing": {
                "deliveryFee": 0,
                "minimumOrderValue": 0,
                "__typename": "VendorAvailabilityPricingFallbacks"
              },
              "__typename": "VendorAvailabilityFallbacks"
            },
            "nonCommissionRevenueInfo": null,
            "vendorRating": {
              "count": 15,
              "value": 5,
              "__typename": "VendorRating"
            },
            "verticalParent": {
              "code": "Restaurant",
              "__typename": "VerticalParent"
            },
            "verticalSegment": {
              "code": "restaurants",
              "__typename": "VerticalSegment"
            },
            "images": {
              "listing": "https://images.deliveryhero.io/image/fd-tr/LH/m5nm-listing.jpg",
              "logo": "https://images.deliveryhero.io/image/fd-tr/LH/m5nm-hero.jpg",
              "__typename": "VendorImagesData"
            },
            "deliveryProvider": "PLATFORM",
            "incentives": [
              {
                "id": "8118134",
                "__typename": "IncentiveData"
              },
              {
                "id": "dynamic-pricing:campaign-override:1058:m5nm",
                "__typename": "IncentiveData"
              }
            ],
            "urlKey": "aile-kebap-and-durum",
            "dynamicPricing": {
              "deliveryFee": {
                "total": 0,
                "__typename": "DynamicPricingDeliveryFee"
              },
              "minimumOrderValue": {
                "total": 300,
                "__typename": "DynamicPricingMinimumOrderValue"
              },
              "__typename": "DynamicPricing"
            },
            "vendorTile": {
              "type": "L",
              "media": {
                "url": "https://images.deliveryhero.io/image/fd-tr/LH/m5nm-listing.jpg",
                "__typename": "Image"
              },
              "primaryTags": [
                {
                  "id": "TAG_DEAL",
                  "elements": [
                    {
                      "__typename": "VendorTileIcon",
                      "iconId": "DISCOUNT",
                      "iconDecorators": []
                    },
                    {
                      "__typename": "VendorTileText",
                      "textId": null,
                      "text": "Tüm ürünlerde %30",
                      "arguments": [],
                      "isTranslationKey": false,
                      "textDecorators": []
                    }
                  ],
                  "__typename": "VendorTileElementGroup"
                }
              ],
              "secondaryTags": [],
              "vendorInfo": [
                [
                  {
                    "id": "VENDOR_INFO_DELIVERY_TIME",
                    "elements": [
                      {
                        "__typename": "VendorTileText",
                        "textId": null,
                        "text": "NEXTGEN_RLP_VENDORTILE_DELIVERY_TIME",
                        "arguments": ["5-30"],
                        "isTranslationKey": true,
                        "textDecorators": []
                      }
                    ],
                    "__typename": "VendorTileElementGroup"
                  },
                  {
                    "id": "VENDOR_INFO_BUDGET_SIGN",
                    "elements": [
                      {
                        "__typename": "VendorTileText",
                        "textId": null,
                        "text": "₺₺",
                        "arguments": [],
                        "isTranslationKey": false,
                        "textDecorators": []
                      }
                    ],
                    "__typename": "VendorTileElementGroup"
                  },
                  {
                    "id": "VENDOR_INFO_MOV",
                    "elements": [
                      {
                        "__typename": "VendorTileText",
                        "textId": null,
                        "text": "NEXTGEN_VENDORTILE_HARD_MOV_MIN",
                        "arguments": ["300TL"],
                        "isTranslationKey": true,
                        "textDecorators": []
                      }
                    ],
                    "__typename": "VendorTileElementGroup"
                  },
                  {
                    "id": "VENDOR_INFO_CUISINES",
                    "elements": [
                      {
                        "__typename": "VendorTileText",
                        "textId": null,
                        "text": "Kebap & Türk Mutfağı",
                        "arguments": [],
                        "isTranslationKey": false,
                        "textDecorators": []
                      }
                    ],
                    "__typename": "VendorTileElementGroup"
                  }
                ],
                [
                  {
                    "id": "VENDOR_INFO_DELIVERY_FEE",
                    "elements": [
                      {
                        "__typename": "VendorTileIcon",
                        "iconId": "RIDER",
                        "iconDecorators": []
                      },
                      {
                        "__typename": "VendorTileText",
                        "textId": null,
                        "text": "25,99TL",
                        "arguments": [],
                        "isTranslationKey": false,
                        "textDecorators": ["STRIKETHROUGH"]
                      },
                      {
                        "__typename": "VendorTileText",
                        "textId": null,
                        "text": "NEXTGEN_HVA_ACQUISITION_FD",
                        "arguments": [],
                        "isTranslationKey": true,
                        "textDecorators": ["HIGHLIGHTED"]
                      }
                    ],
                    "__typename": "VendorTileElementGroup"
                  }
                ]
              ],
              "__typename": "VendorTile"
            }
          }
        }
      ],
      "availabilityEvents": null,
      "experiments": null,
      "tokenPagination": {
        "token": "eyJsaW1pdCI6NDAsIm9mZnNldCI6NDB9",
        "expiresAt": null,
        "__typename": "TokenPagination"
      },
      "vendorAggregations": {
        "cuisines": [
          { "__typename": "VendorAggregation", "id": "1057", "title": "Balık ve Deniz Ürünleri", "count": 46 },
          { "__typename": "VendorAggregation", "id": "1058", "title": "Burger", "count": 296 },
          { "__typename": "VendorAggregation", "id": "1063", "title": "Dondurma", "count": 52 },
          { "__typename": "VendorAggregation", "id": "1064", "title": "Döner", "count": 247 },
          { "__typename": "VendorAggregation", "id": "1065", "title": "Dünya Mutfağı", "count": 375 },
          { "__typename": "VendorAggregation", "id": "1067", "title": "Ev Yemekleri", "count": 272 },
          { "__typename": "VendorAggregation", "id": "1069", "title": "Kahvaltı & Börek", "count": 247 },
          { "__typename": "VendorAggregation", "id": "1070", "title": "Kahve", "count": 234 },
          { "__typename": "VendorAggregation", "id": "1071", "title": "Kebap & Türk Mutfağı", "count": 466 },
          { "__typename": "VendorAggregation", "id": "1072", "title": "Kokoreç", "count": 24 },
          { "__typename": "VendorAggregation", "id": "1074", "title": "Kumpir", "count": 15 },
          { "__typename": "VendorAggregation", "id": "1075", "title": "Kumru", "count": 1 },
          { "__typename": "VendorAggregation", "id": "1073", "title": "Köfte", "count": 105 },
          { "__typename": "VendorAggregation", "id": "1104", "title": "Makarna", "count": 162 },
          { "__typename": "VendorAggregation", "id": "1077", "title": "Mantı", "count": 73 },
          { "__typename": "VendorAggregation", "id": "1078", "title": "Meze", "count": 134 },
          { "__typename": "VendorAggregation", "id": "1079", "title": "Pastane & Fırın", "count": 123 },
          { "__typename": "VendorAggregation", "id": "1080", "title": "Pide & Lahmacun", "count": 287 },
          { "__typename": "VendorAggregation", "id": "1081", "title": "Pilav", "count": 212 },
          { "__typename": "VendorAggregation", "id": "1082", "title": "Pizza", "count": 175 },
          { "__typename": "VendorAggregation", "id": "1076", "title": "Salata", "count": 159 },
          { "__typename": "VendorAggregation", "id": "1084", "title": "Steak", "count": 25 },
          { "__typename": "VendorAggregation", "id": "1085", "title": "Tantuni", "count": 20 },
          { "__typename": "VendorAggregation", "id": "1086", "title": "Tatlı", "count": 505 },
          { "__typename": "VendorAggregation", "id": "1087", "title": "Tavuk", "count": 221 },
          { "__typename": "VendorAggregation", "id": "1088", "title": "Tost & Sandviç", "count": 399 },
          { "__typename": "VendorAggregation", "id": "1089", "title": "Uzak Doğu", "count": 83 },
          { "__typename": "VendorAggregation", "id": "1105", "title": "Vejetaryen & Vegan", "count": 60 },
          { "__typename": "VendorAggregation", "id": "1091", "title": "Vejetaryen Seçenekli", "count": 2 },
          { "__typename": "VendorAggregation", "id": "1090", "title": "Waffle", "count": 68 },
          { "__typename": "VendorAggregation", "id": "1060", "title": "Çi Börek", "count": 1 },
          { "__typename": "VendorAggregation", "id": "1061", "title": "Çiğ Köfte", "count": 152 }
        ],
        "foodCharacteristics": [
          { "__typename": "VendorAggregation", "id": "7", "title": "Express Teslimat", "count": 2472 },
          { "__typename": "VendorAggregation", "id": "2", "title": "Restoran Teslimatlı", "count": 860 }
        ],
        "quickFilters": [
          { "__typename": "VendorAggregation", "id": "is_super_vendor", "title": "is_super_vendor", "count": 513 },
          { "__typename": "VendorAggregation", "id": "is_voucher_enabled", "title": "is_voucher_enabled", "count": 3457 },
          { "__typename": "VendorAggregation", "id": "is_new", "title": "is_new", "count": 228 },
          { "__typename": "VendorAggregation", "id": "AGGREGATION_FREE_DELIVERY_DISCOUNT", "title": "has_free_delivery", "count": 3463 },
          { "__typename": "VendorAggregation", "id": "AGGREGATION_HAS_DISCOUNT", "title": "has_discount", "count": 3099 },
          { "__typename": "VendorAggregation", "id": null, "title": "has_online_payment", "count": 0 }
        ],
        "discountLabels": [],
        "partners": [],
        "paymentTypes": [
          { "__typename": "VendorAggregation", "id": "yemekpay_creditcard", "title": "NEXTGEN_PAYMENT_SELECTION_YEMEKPAY_CREDITCARD", "count": 3463 },
          { "__typename": "VendorAggregation", "id": "cash", "title": "NEXTGEN_PAYMENT_SELECTION_CASH", "count": 3369 },
          { "__typename": "VendorAggregation", "id": "yemekpay_cardondelivery", "title": "NEXTGEN_PAYMENT_SELECTION_YEMEKPAY_CARDONDELIVERY", "count": 2518 },
          { "__typename": "VendorAggregation", "id": "yemekpay_cardpayment", "title": "NEXTGEN_PAYMENT_SELECTION_YEMEKPAY_CARDPAYMENT", "count": 935 },
          { "__typename": "VendorAggregation", "id": "craftgate_edenred", "title": "NEXTGEN_PAYMENT_SELECTION_CRAFTGATE_EDENRED", "count": 1492 },
          { "__typename": "VendorAggregation", "id": "multinet_mealcard", "title": "NEXTGEN_PAYMENT_SELECTION_MULTINET_MEALCARD", "count": 1271 },
          { "__typename": "VendorAggregation", "id": "multinet", "title": "NEXTGEN_PAYMENT_SELECTION_MULTINET", "count": 577 },
          { "__typename": "VendorAggregation", "id": "metropol_card", "title": "NEXTGEN_PAYMENT_SELECTION_METROPOL_CARD", "count": 530 },
          { "__typename": "VendorAggregation", "id": "set_card", "title": "NEXTGEN_PAYMENT_SELECTION_SET_CARD", "count": 575 },
          { "__typename": "VendorAggregation", "id": "ticket_restaurant_meal_card", "title": "NEXTGEN_PAYMENT_SELECTION_TICKET_RESTAURANT_MEAL_CARD", "count": 564 },
          { "__typename": "VendorAggregation", "id": "pluxee_mealcard", "title": "NEXTGEN_PAYMENT_SELECTION_PLUXEE_MEALCARD", "count": 1529 },
          { "__typename": "VendorAggregation", "id": "sodexo_restaurant_pass_mobile", "title": "NEXTGEN_PAYMENT_SELECTION_SODEXO_RESTAURANT_PASS_MOBILE", "count": 555 },
          { "__typename": "VendorAggregation", "id": "sodexo_restaurant_pass", "title": "NEXTGEN_PAYMENT_SELECTION_SODEXO_RESTAURANT_PASS", "count": 418 },
          { "__typename": "VendorAggregation", "id": "balance", "title": "NEXTGEN_PAYMENT_SELECTION_BALANCE", "count": 3336 },
          { "__typename": "VendorAggregation", "id": "voucher_tokenflex", "title": "NEXTGEN_PAYMENT_SELECTION_VOUCHER_TOKENFLEX", "count": 441 },
          { "__typename": "VendorAggregation", "id": "paye_card", "title": "NEXTGEN_PAYMENT_SELECTION_PAYE_CARD", "count": 44 },
          { "__typename": "VendorAggregation", "id": "iyzico_yemeksepetipay", "title": "NEXTGEN_PAYMENT_SELECTION_IYZICO_YEMEKSEPETIPAY", "count": 3432 },
          { "__typename": "VendorAggregation", "id": "yemekmatik_meal_card", "title": "NEXTGEN_PAYMENT_SELECTION_YEMEKMATIK_MEAL_CARD", "count": 22 },
          { "__typename": "VendorAggregation", "id": "winwin_mobile", "title": "NEXTGEN_PAYMENT_SELECTION_WINWIN_MOBILE", "count": 11 },
          { "__typename": "VendorAggregation", "id": "cio_card", "title": "NEXTGEN_PAYMENT_SELECTION_CIO_CARD", "count": 77 }
        ],
        "deliveryProviders": [
          { "__typename": "VendorAggregation", "id": "platform_delivery", "title": "", "count": 2565 },
          { "__typename": "VendorAggregation", "id": "vendor_delivery", "title": "", "count": 898 }
        ],
        "__typename": "VendorAggregations"
      },
      "totalVendors": 3463,
      "__typename": "VendorListingPage"
    }
  },
  "extensions": {
    "x-request-id": "b6ba3a8df24a02708cb6e831cc519d84"
  }
}
```
