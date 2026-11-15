export default {
 "spots": {
  "pelaminan": [
   0,
   1.66,
   3.3,
   0
  ],
  "tangga": [
   0,
   0,
   7.2,
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
    -8.6,
    0,
    24.2,
    0.9
   ]
  },
  {
   "easel": [
    8.6,
    0,
    24.2,
    -0.9
   ]
  },
  {
   "easel": [
    -8.6,
    0,
    12.6,
    0.9
   ]
  },
  {
   "easel": [
    8.6,
    0,
    12.6,
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
       2.6,
       72
      ],
      [
       0,
       3.0,
       58
      ]
     ],
     "look": [
      [
       0,
       4.6,
       30
      ],
      [
       0,
       4.4,
       30
      ]
     ],
     "duration": 16,
     "ease": "sine.out",
     "fov": 38,
     "mobileFov": 56,
     "idleOrbit": 0.04,
     "couple": "pelaminan",
     "exposure": 0.88,
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
   "label": "Rumah Gadang",
   "steps": [
    {
     "path": [
      [
       0,
       3.0,
       58
      ],
      [
       0,
       2.8,
       40
      ],
      [
       0,
       2.6,
       30
      ],
      [
       0,
       3.0,
       21
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
       4.0,
       20
      ],
      [
       0,
       5.0,
       8
      ],
      [
       0,
       6.0,
       0
      ]
     ],
     "duration": 12,
     "fov": 42,
     "mobileFov": 60,
     "idleOrbit": 0.04,
     "mobilePullback": 1,
     "exposure": 0.92,
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
       3.0,
       21
      ],
      [
       7,
       6.5,
       25
      ],
      [
       15,
       10.5,
       30
      ]
     ],
     "look": [
      [
       0,
       6.0,
       0
      ],
      [
       0,
       6.5,
       0
      ],
      [
       0,
       7,
       -1
      ]
     ],
     "duration": 11,
     "fov": 44,
     "mobileFov": 62,
     "mobilePullback": 1,
     "idleOrbit": 0.03,
     "exposure": 0.92,
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
   "label": "Pelaminan",
   "steps": [
    {
     "path": [
      [
       0,
       3.0,
       16
      ],
      [
       0,
       3.0,
       12.5
      ],
      [
       0,
       2.85,
       9.2
      ]
     ],
     "look": [
      [
       0,
       3.2,
       3
      ],
      [
       0,
       2.9,
       3.3
      ],
      [
       0,
       2.55,
       3.3
      ]
     ],
     "duration": 10,
     "transition": "fade",
     "fov": 34,
     "mobileFov": 50,
     "idleOrbit": 0.06,
     "couple": "pelaminan",
     "exposure": 0.95,
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
       -6.0,
       2.3,
       27.599999999999998
      ],
      [
       -5.199999999999999,
       1.9,
       26.4
      ]
     ],
     "look": [
      [
       -8.6,
       1.6,
       24.2
      ],
      [
       -8.6,
       1.45,
       24.2
      ]
     ],
     "duration": 6,
     "transition": "fade",
     "chapter": 0,
     "fov": 40,
     "mobileFov": 60,
     "idleOrbit": 0.05,
     "couple": "pelaminan",
     "exposure": 0.95,
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
       6.0,
       2.3,
       27.599999999999998
      ],
      [
       5.199999999999999,
       1.9,
       26.4
      ]
     ],
     "look": [
      [
       8.6,
       1.6,
       24.2
      ],
      [
       8.6,
       1.45,
       24.2
      ]
     ],
     "duration": 6,
     "transition": "fade",
     "chapter": 1,
     "fov": 40,
     "mobileFov": 60,
     "idleOrbit": 0.05,
     "couple": "pelaminan",
     "exposure": 0.95,
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
       -6.0,
       2.3,
       16.0
      ],
      [
       -5.199999999999999,
       1.9,
       14.8
      ]
     ],
     "look": [
      [
       -8.6,
       1.6,
       12.6
      ],
      [
       -8.6,
       1.45,
       12.6
      ]
     ],
     "duration": 6,
     "transition": "fade",
     "chapter": 2,
     "fov": 40,
     "mobileFov": 60,
     "idleOrbit": 0.05,
     "couple": "pelaminan",
     "exposure": 0.95,
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
       6.0,
       2.3,
       16.0
      ],
      [
       5.199999999999999,
       1.9,
       14.8
      ]
     ],
     "look": [
      [
       8.6,
       1.6,
       12.6
      ],
      [
       8.6,
       1.45,
       12.6
      ]
     ],
     "duration": 6,
     "transition": "fade",
     "chapter": 3,
     "fov": 40,
     "mobileFov": 60,
     "idleOrbit": 0.05,
     "couple": "pelaminan",
     "exposure": 0.95,
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
       -4.5,
       3.6,
       13.5
      ],
      [
       -2.4,
       3.1,
       10.2
      ]
     ],
     "look": [
      [
       0,
       3.4,
       0
      ],
      [
       0,
       3.2,
       0
      ]
     ],
     "duration": 8,
     "transition": "fade",
     "fov": 46,
     "mobileFov": 60,
     "mobilePullback": 1,
     "idleOrbit": 0.04,
     "couple": "pelaminan",
     "exposure": 0.96,
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
       0.9,
       2.4,
       13.6
      ],
      [
       0.6,
       1.8,
       10.8
      ]
     ],
     "look": [
      [
       0,
       1.6,
       7.2
      ],
      [
       0,
       1.4,
       7.2
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
       0.6,
       1.8,
       10.8
      ],
      [
       0,
       4.5,
       19
      ],
      [
       0,
       9,
       30
      ],
      [
       0,
       15,
       40
      ]
     ],
     "look": [
      [
       0,
       1.4,
       7.2
      ],
      [
       0,
       3.5,
       3
      ],
      [
       0,
       6,
       0
      ],
      [
       0,
       7,
       -1
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
