export default {
  "spots": {
    "pelaminan": [
      0,
      1.04,
      7.25,
      0
    ],
    "tangga": [
      0,
      0,
      11.6,
      0
    ],
    "halaman": [
      0,
      0,
      22,
      0
    ]
  },
  "stations": [
    {
      "easel": [
        -7.2,
        0,
        22.5,
        0.9
      ]
    },
    {
      "easel": [
        7.2,
        0,
        22.5,
        -0.9
      ]
    },
    {
      "easel": [
        -7.2,
        0,
        15,
        0.9
      ]
    },
    {
      "easel": [
        7.2,
        0,
        15,
        -0.9
      ]
    }
  ],
  "scenes": [
    {
      "id": "opening",
      "label": "Selamat Datang",
      "steps": [
        {
          "path": [
            [
              0,
              3.2,
              76
            ],
            [
              0,
              3.4,
              60
            ]
          ],
          "look": [
            [
              0,
              4.4,
              30
            ],
            [
              0,
              4.2,
              30
            ]
          ],
          "duration": 16,
          "ease": "sine.out",
          "fov": 38,
          "mobileFov": 56,
          "idleOrbit": 0.04,
          "couple": "pelaminan",
          "exposure": 0.9,
          "petals": 0.5,
          "ambience": {
            "birds": 0.5,
            "water": 0
          }
        }
      ]
    },
    {
      "id": "intro",
      "label": "Rumah Kebaya",
      "steps": [
        {
          "path": [
            [
              0,
              3.4,
              60
            ],
            [
              0,
              3.0,
              42
            ],
            [
              0,
              2.8,
              33.5
            ],
            [
              0,
              3.4,
              22
            ]
          ],
          "look": [
            [
              0,
              4.2,
              30
            ],
            [
              0,
              4.0,
              20
            ],
            [
              0,
              4.6,
              7
            ],
            [
              0,
              4.8,
              5
            ]
          ],
          "duration": 12,
          "fov": 42,
          "mobileFov": 60,
          "idleOrbit": 0.04,
          "mobilePullback": 1,
          "exposure": 0.93,
          "petals": 0.7,
          "ambience": {
            "birds": 0.6,
            "water": 0
          }
        },
        {
          "path": [
            [
              0,
              3.4,
              22
            ],
            [
              8,
              6.5,
              26
            ],
            [
              17,
              9.5,
              31
            ]
          ],
          "look": [
            [
              0,
              4.8,
              5
            ],
            [
              0,
              4.8,
              5
            ],
            [
              0,
              4.8,
              5
            ]
          ],
          "duration": 11,
          "fov": 44,
          "mobileFov": 62,
          "mobilePullback": 1,
          "idleOrbit": 0.03,
          "exposure": 0.93,
          "petals": 0.6,
          "ambience": {
            "birds": 0.6,
            "water": 0
          }
        }
      ]
    },
    {
      "id": "couple",
      "label": "Mempelai",
      "steps": [
        {
          "path": [
            [
              0,
              2.7,
              19
            ],
            [
              0,
              2.4,
              14.8
            ],
            [
              0,
              2.35,
              12.6
            ]
          ],
          "look": [
            [
              0,
              2.3,
              7.2
            ],
            [
              0,
              2.1,
              7.25
            ],
            [
              0,
              1.95,
              7.25
            ]
          ],
          "duration": 10,
          "transition": "fade",
          "fov": 34,
          "mobileFov": 50,
          "idleOrbit": 0.06,
          "couple": "pelaminan",
          "exposure": 0.96,
          "petals": 0.3,
          "ambience": {
            "birds": 0.3,
            "water": 0
          },
          "mobilePullback": 1
        }
      ]
    },
    {
      "id": "story",
      "label": "Kisah Kami",
      "steps": [
        {
          "path": [
            [
              -4.4,
              2.1,
              26.6
            ],
            [
              -3.7,
              1.85,
              25.4
            ]
          ],
          "look": [
            [
              -7.2,
              1.6,
              22.5
            ],
            [
              -7.2,
              1.5,
              22.5
            ]
          ],
          "duration": 6,
          "transition": "fade",
          "chapter": 0,
          "fov": 40,
          "mobileFov": 60,
          "idleOrbit": 0.05,
          "couple": "pelaminan",
          "exposure": 0.96,
          "petals": 0.5,
          "ambience": {
            "birds": 0.5,
            "water": 0
          },
          "mobilePullback": 1
        },
        {
          "path": [
            [
              4.4,
              2.1,
              26.6
            ],
            [
              3.7,
              1.85,
              25.4
            ]
          ],
          "look": [
            [
              7.2,
              1.6,
              22.5
            ],
            [
              7.2,
              1.5,
              22.5
            ]
          ],
          "duration": 6,
          "transition": "fade",
          "chapter": 1,
          "fov": 40,
          "mobileFov": 60,
          "idleOrbit": 0.05,
          "couple": "pelaminan",
          "exposure": 0.96,
          "petals": 0.5,
          "ambience": {
            "birds": 0.5,
            "water": 0
          },
          "mobilePullback": 1
        },
        {
          "path": [
            [
              -4.4,
              2.1,
              19.1
            ],
            [
              -3.7,
              1.85,
              17.9
            ]
          ],
          "look": [
            [
              -7.2,
              1.6,
              15
            ],
            [
              -7.2,
              1.5,
              15
            ]
          ],
          "duration": 6,
          "transition": "fade",
          "chapter": 2,
          "fov": 40,
          "mobileFov": 60,
          "idleOrbit": 0.05,
          "couple": "pelaminan",
          "exposure": 0.96,
          "petals": 0.5,
          "ambience": {
            "birds": 0.5,
            "water": 0
          },
          "mobilePullback": 1
        },
        {
          "path": [
            [
              4.4,
              2.1,
              19.1
            ],
            [
              3.7,
              1.85,
              17.9
            ]
          ],
          "look": [
            [
              7.2,
              1.6,
              15
            ],
            [
              7.2,
              1.5,
              15
            ]
          ],
          "duration": 6,
          "transition": "fade",
          "chapter": 3,
          "fov": 40,
          "mobileFov": 60,
          "idleOrbit": 0.05,
          "couple": "pelaminan",
          "exposure": 0.96,
          "petals": 0.5,
          "ambience": {
            "birds": 0.5,
            "water": 0
          },
          "mobilePullback": 1
        }
      ]
    },
    {
      "id": "ceremony",
      "label": "Akad & Resepsi",
      "steps": [
        {
          "path": [
            [
              -7.5,
              3.0,
              17.5
            ],
            [
              -4.8,
              2.6,
              13.6
            ]
          ],
          "look": [
            [
              0,
              2.2,
              6
            ],
            [
              0,
              2.1,
              6.5
            ]
          ],
          "duration": 8,
          "transition": "fade",
          "fov": 46,
          "mobileFov": 60,
          "mobilePullback": 1,
          "idleOrbit": 0.04,
          "couple": "pelaminan",
          "exposure": 0.97,
          "petals": 0.3,
          "ambience": {
            "birds": 0.2,
            "water": 0
          }
        }
      ]
    },
    {
      "id": "closing",
      "label": "Terima Kasih",
      "steps": [
        {
          "path": [
            [
              1.0,
              1.9,
              18.0
            ],
            [
              0.7,
              1.7,
              16.0
            ]
          ],
          "look": [
            [
              0,
              1.5,
              11.6
            ],
            [
              0,
              1.4,
              11.6
            ]
          ],
          "duration": 8,
          "transition": "fade",
          "fov": 36,
          "mobileFov": 52,
          "idleOrbit": 0.12,
          "couple": "tangga",
          "exposure": 0.98,
          "petals": 1,
          "ambience": {
            "birds": 0.4,
            "water": 0
          }
        },
        {
          "path": [
            [
              0.7,
              1.7,
              16.0
            ],
            [
              0,
              4.6,
              24
            ],
            [
              0,
              9,
              34
            ],
            [
              0,
              15,
              46
            ]
          ],
          "look": [
            [
              0,
              1.4,
              11.6
            ],
            [
              0,
              3.5,
              6
            ],
            [
              0,
              5,
              3
            ],
            [
              0,
              5.5,
              3
            ]
          ],
          "duration": 15,
          "ease": "power1.inOut",
          "fov": 42,
          "mobileFov": 62,
          "mobilePullback": 1,
          "idleOrbit": 0.03,
          "couple": "tangga",
          "exposure": 1.0,
          "petals": 1,
          "ambience": {
            "birds": 0.5,
            "water": 0
          }
        }
      ]
    }
  ]
};
