export default {
 "spots": {
  "pendopo": [
   0,
   0.94,
   13,
   0
  ],
  "dalem": [
   0,
   1.56,
   -14.3,
   0
  ],
  "forecourt": [
   0,
   0.07,
   31,
   0
  ]
 },
 "stations": [
  {
   "easel": [
    -16.6,
    0.07,
    28.8,
    2.313
   ]
  },
  {
   "easel": [
    16.6,
    0.07,
    28.8,
    -2.313
   ]
  },
  {
   "easel": [
    -17.0,
    0.07,
    6.8,
    2.132
   ]
  },
  {
   "easel": [
    17.0,
    0.07,
    6.8,
    -2.132
   ]
  }
 ],
 "scenes": [
  {
   "id": "opening",
   "label": "Welcome",
   "steps": [
    {
     "path": [
      [
       0,
       2.4,
       74
      ],
      [
       0,
       2.8,
       63
      ]
     ],
     "look": [
      [
       0,
       4.6,
       40
      ],
      [
       0,
       4.4,
       40
      ]
     ],
     "duration": 16,
     "ease": "sine.out",
     "fov": 38,
     "mobileFov": 56,
     "idleOrbit": 0.05,
     "couple": "pendopo",
     "exposure": 0.86,
     "petals": 0.6,
     "ambience": {
      "birds": 0.5,
      "water": 0
     }
    }
   ]
  },
  {
   "id": "intro",
   "label": "The Keraton",
   "steps": [
    {
     "path": [
      [
       0,
       2.8,
       63
      ],
      [
       0,
       7.5,
       56
      ],
      [
       0,
       10.6,
       47
      ],
      [
       0,
       6.0,
       40
      ],
      [
       0,
       2.6,
       33
      ]
     ],
     "look": [
      [
       0,
       4.4,
       40
      ],
      [
       0,
       5,
       32
      ],
      [
       0,
       4,
       22
      ],
      [
       0,
       3.2,
       16
      ],
      [
       0,
       3.2,
       12
      ]
     ],
     "duration": 12,
     "fov": 40,
     "mobileFov": 58,
     "idleOrbit": 0.05,
     "exposure": 0.9,
     "petals": 0.9,
     "ambience": {
      "birds": 0.7,
      "water": 0
     },
     "mobilePullback": 1
    },
    {
     "path": [
      [
       0,
       2.6,
       33
      ],
      [
       2.5,
       9,
       38
      ],
      [
       12,
       18,
       46
      ]
     ],
     "look": [
      [
       0,
       3.2,
       12
      ],
      [
       0,
       4,
       6
      ],
      [
       0,
       3,
       -6
      ]
     ],
     "duration": 11,
     "fov": 42,
     "mobileFov": 62,
     "mobilePullback": 1,
     "idleOrbit": 0.04,
     "exposure": 0.92,
     "petals": 0.7,
     "ambience": {
      "birds": 0.6,
      "water": 0
     }
    }
   ]
  },
  {
   "id": "couple",
   "label": "Bride & Groom",
   "steps": [
    {
     "transition": "fade",
     "path": [
      [
       2.6,
       3.1,
       20.2
      ],
      [
       1.6,
       2.5,
       18.6
      ],
      [
       1.0,
       2.15,
       17.4
      ]
     ],
     "look": [
      [
       0,
       3,
       12
      ],
      [
       0,
       2.3,
       13
      ],
      [
       0,
       2.05,
       13
      ]
     ],
     "duration": 9,
     "fov": 34,
     "mobileFov": 50,
     "idleOrbit": 0.12,
     "couple": "pendopo",
     "exposure": 0.9,
     "petals": 0.4,
     "ambience": {
      "birds": 0.4,
      "water": 0
     },
     "mobilePullback": 1.15
    }
   ]
  },
  {
   "id": "story",
   "label": "Our Story",
   "steps": [
    {
     "fov": 40,
     "mobileFov": 62,
     "idleOrbit": 0.035,
     "petals": 0.5,
     "ambience": {
      "birds": 0.5,
      "water": 0
     },
     "transition": "fade",
     "path": [
      [
       -7.5,
       2.8,
       26.2
      ],
      [
       -13,
       2.4,
       25.5
      ]
     ],
     "look": [
      [
       -17,
       3,
       32
      ],
      [
       -20,
       2.7,
       33
      ]
     ],
     "duration": 6,
     "couple": "pendopo",
     "exposure": 0.9,
     "chapter": 0,
     "mobilePullback": 1
    },
    {
     "fov": 40,
     "mobileFov": 62,
     "idleOrbit": 0.035,
     "petals": 0.5,
     "ambience": {
      "birds": 0.5,
      "water": 0
     },
     "path": [
      [
       -13,
       2.4,
       25.5
      ],
      [
       0,
       3.6,
       27.5
      ],
      [
       13,
       2.4,
       25.5
      ]
     ],
     "look": [
      [
       -20,
       2.7,
       33
      ],
      [
       0,
       3,
       34
      ],
      [
       20,
       2.7,
       33
      ]
     ],
     "duration": 7,
     "couple": "dalem",
     "exposure": 0.92,
     "chapter": 1,
     "mobilePullback": 1
    },
    {
     "fov": 40,
     "mobileFov": 62,
     "idleOrbit": 0.08,
     "petals": 0.5,
     "ambience": {
      "birds": 0.5,
      "water": 0
     },
     "transition": "fade",
     "path": [
      [
       -11,
       3.1,
       1.6
      ],
      [
       -13.5,
       2.4,
       4.6
      ]
     ],
     "look": [
      [
       -18,
       2.8,
       8
      ],
      [
       -22,
       2.9,
       9.5
      ]
     ],
     "duration": 6,
     "couple": "dalem",
     "exposure": 0.94,
     "chapter": 2,
     "mobilePullback": 1
    },
    {
     "fov": 40,
     "mobileFov": 62,
     "idleOrbit": 0.08,
     "petals": 0.5,
     "ambience": {
      "birds": 0.5,
      "water": 0
     },
     "transition": "fade",
     "path": [
      [
       11,
       3.1,
       1.6
      ],
      [
       13.5,
       2.4,
       4.6
      ]
     ],
     "look": [
      [
       18,
       2.8,
       8
      ],
      [
       22,
       2.9,
       9.5
      ]
     ],
     "duration": 6,
     "couple": "dalem",
     "exposure": 0.96,
     "chapter": 3,
     "mobilePullback": 1
    }
   ]
  },
  {
   "id": "ceremony",
   "label": "The Ceremony",
   "steps": [
    {
     "transition": "fade",
     "path": [
      [
       2.4,
       3.1,
       -8.9
      ],
      [
       1.2,
       2.8,
       -9.7
      ]
     ],
     "look": [
      [
       0,
       2.6,
       -15
      ],
      [
       0,
       2.35,
       -15
      ]
     ],
     "duration": 8,
     "fov": 46,
     "mobileFov": 62,
     "mobilePullback": 1,
     "idleOrbit": 0.05,
     "couple": "dalem",
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
   "label": "Celebrate",
   "steps": [
    {
     "transition": "fade",
     "path": [
      [
       2.6,
       2.3,
       38
      ],
      [
       1.4,
       1.75,
       34.8
      ]
     ],
     "look": [
      [
       0,
       1.6,
       31
      ],
      [
       0,
       1.35,
       31
      ]
     ],
     "duration": 8,
     "fov": 34,
     "mobileFov": 50,
     "idleOrbit": 0.2,
     "couple": "forecourt",
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
       1.4,
       1.75,
       34.8
      ],
      [
       3,
       4,
       39.5
      ],
      [
       2,
       9,
       47
      ],
      [
       0,
       15,
       59
      ]
     ],
     "look": [
      [
       0,
       1.35,
       31
      ],
      [
       0,
       3,
       25
      ],
      [
       0,
       4,
       12
      ],
      [
       0,
       3,
       -6
      ]
     ],
     "duration": 15,
     "ease": "power1.inOut",
     "fov": 42,
     "mobileFov": 62,
     "mobilePullback": 1,
     "idleOrbit": 0.03,
     "couple": "forecourt",
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
