export default {
 "spots": {
  "pelaminan": [
   0,
   0.55,
   13.0,
   0
  ],
  "tangga": [
   0,
   0,
   21.5,
   0
  ],
  "halaman": [
   0,
   0,
   28,
   0
  ]
 },
 "stations": [
  {
   "easel": [
    -22,
    0,
    31.5,
    0.7
   ]
  },
  {
   "easel": [
    -31,
    0,
    33.5,
    0.0
   ]
  },
  {
   "easel": [
    -40,
    0,
    12.5,
    0.9
   ]
  },
  {
   "easel": [
    -24,
    0,
    12,
    -0.6
   ]
  }
 ],
 "scenes": [
  {
   "id": "opening",
   "label": "The Royal Malay Gate",
   "steps": [
    {
     "path": [
      [
       0,
       3.6,
       92
      ],
      [
       0,
       4.2,
       72
      ]
     ],
     "look": [
      [
       0,
       6,
       44
      ],
      [
       0,
       7,
       44
      ]
     ],
     "duration": 16,
     "fov": 38,
     "mobileFov": 56,
     "idleOrbit": 0.04,
     "mobilePullback": 1,
     "exposure": 0.9,
     "petals": 0.5,
     "ambience": {
      "birds": 0.4,
      "water": 0
     },
     "ease": "sine.out",
     "couple": "pelaminan"
    }
   ]
  },
  {
   "id": "intro",
   "label": "The Golden Malay Palace",
   "steps": [
    {
     "path": [
      [
       0,
       4.2,
       72
      ],
      [
       0,
       12,
       62
      ],
      [
       0,
       25,
       52
      ],
      [
       0,
       24,
       36
      ]
     ],
     "look": [
      [
       0,
       6,
       44
      ],
      [
       0,
       9,
       20
      ],
      [
       0,
       9,
       0
      ],
      [
       0,
       8,
       -8
      ]
     ],
     "duration": 14,
     "fov": 42,
     "mobileFov": 60,
     "idleOrbit": 0.04,
     "mobilePullback": 1,
     "exposure": 0.93,
     "petals": 0.7,
     "ambience": {
      "birds": 0.5,
      "water": 0.2
     }
    },
    {
     "path": [
      [
       0,
       24,
       36
      ],
      [
       -12,
       16,
       36
      ],
      [
       -24,
       11,
       42
      ]
     ],
     "look": [
      [
       0,
       8,
       -8
      ],
      [
       -18,
       3,
       22
      ],
      [
       -31,
       1.5,
       20
      ]
     ],
     "duration": 11,
     "fov": 44,
     "mobileFov": 62,
     "idleOrbit": 0.03,
     "mobilePullback": 1,
     "exposure": 0.94,
     "petals": 0.8,
     "ambience": {
      "birds": 0.5,
      "water": 0.2
     }
    }
   ]
  },
  {
   "id": "couple",
   "label": "The Royal Malay Couple",
   "steps": [
    {
     "path": [
      [
       0,
       2.9,
       27
      ],
      [
       0,
       2.6,
       22
      ],
      [
       0,
       2.5,
       19.8
      ]
     ],
     "look": [
      [
       0,
       2.4,
       13
      ],
      [
       0,
       2.2,
       13
      ],
      [
       0,
       2.1,
       13
      ]
     ],
     "duration": 10,
     "fov": 34,
     "mobileFov": 50,
     "idleOrbit": 0.06,
     "mobilePullback": 1,
     "exposure": 0.96,
     "petals": 0.3,
     "ambience": {
      "birds": 0.5,
      "water": 0.2
     },
     "transition": "fade",
     "couple": "pelaminan"
    }
   ]
  },
  {
   "id": "story",
   "label": "Our Love Story",
   "steps": [
    {
     "path": [
      [
       -19.17,
       2.1,
       34.87
      ],
      [
       -19.62,
       1.85,
       34.33
      ]
     ],
     "look": [
      [
       -22,
       1.6,
       31.5
      ],
      [
       -22,
       1.5,
       31.5
      ]
     ],
     "duration": 6,
     "fov": 40,
     "mobileFov": 60,
     "idleOrbit": 0.05,
     "mobilePullback": 1,
     "exposure": 0.96,
     "petals": 0.6,
     "ambience": {
      "birds": 0.5,
      "water": 0.2
     },
     "transition": "fade",
     "chapter": 0,
     "couple": "pelaminan"
    },
    {
     "path": [
      [
       -31.0,
       2.1,
       37.9
      ],
      [
       -31.0,
       1.85,
       37.2
      ]
     ],
     "look": [
      [
       -31,
       1.6,
       33.5
      ],
      [
       -31,
       1.5,
       33.5
      ]
     ],
     "duration": 6,
     "fov": 40,
     "mobileFov": 60,
     "idleOrbit": 0.05,
     "mobilePullback": 1,
     "exposure": 0.96,
     "petals": 0.6,
     "ambience": {
      "birds": 0.5,
      "water": 0.2
     },
     "transition": "fade",
     "chapter": 1,
     "couple": "pelaminan"
    },
    {
     "path": [
      [
       -36.55,
       2.1,
       15.24
      ],
      [
       -37.1,
       1.85,
       14.8
      ]
     ],
     "look": [
      [
       -40,
       1.6,
       12.5
      ],
      [
       -40,
       1.5,
       12.5
      ]
     ],
     "duration": 6,
     "fov": 40,
     "mobileFov": 60,
     "idleOrbit": 0.05,
     "mobilePullback": 1,
     "exposure": 0.96,
     "petals": 0.6,
     "ambience": {
      "birds": 0.5,
      "water": 0.2
     },
     "transition": "fade",
     "chapter": 2,
     "couple": "pelaminan"
    },
    {
     "path": [
      [
       -26.48,
       2.1,
       15.63
      ],
      [
       -26.09,
       1.85,
       15.05
      ]
     ],
     "look": [
      [
       -24,
       1.6,
       12
      ],
      [
       -24,
       1.5,
       12
      ]
     ],
     "duration": 6,
     "fov": 40,
     "mobileFov": 60,
     "idleOrbit": 0.05,
     "mobilePullback": 1,
     "exposure": 0.96,
     "petals": 0.6,
     "ambience": {
      "birds": 0.5,
      "water": 0.2
     },
     "transition": "fade",
     "chapter": 3,
     "couple": "pelaminan"
    }
   ]
  },
  {
   "id": "ceremony",
   "label": "The Royal Malay Wedding Ceremony",
   "steps": [
    {
     "path": [
      [
       -8,
       3.6,
       28
      ],
      [
       -4.8,
       2.9,
       23.5
      ]
     ],
     "look": [
      [
       0,
       3.2,
       11
      ],
      [
       0,
       3.2,
       11
      ]
     ],
     "duration": 8,
     "fov": 46,
     "mobileFov": 60,
     "idleOrbit": 0.04,
     "mobilePullback": 1,
     "exposure": 0.97,
     "petals": 0.3,
     "ambience": {
      "birds": 0.2,
      "water": 0.1
     },
     "transition": "fade",
     "couple": "pelaminan"
    }
   ]
  },
  {
   "id": "closing",
   "label": "The Golden Heritage",
   "steps": [
    {
     "path": [
      [
       1,
       2.0,
       26
      ],
      [
       0.7,
       1.8,
       25
      ]
     ],
     "look": [
      [
       0,
       1.5,
       21.5
      ],
      [
       0,
       1.4,
       21.5
      ]
     ],
     "duration": 8,
     "fov": 36,
     "mobileFov": 52,
     "idleOrbit": 0.12,
     "mobilePullback": 1,
     "exposure": 0.98,
     "petals": 1,
     "ambience": {
      "birds": 0.5,
      "water": 0.2
     },
     "transition": "fade",
     "couple": "tangga"
    },
    {
     "path": [
      [
       0.7,
       1.8,
       25
      ],
      [
       0,
       14,
       30
      ],
      [
       0,
       25,
       42
      ],
      [
       0,
       30,
       62
      ],
      [
       0,
       34,
       84
      ]
     ],
     "look": [
      [
       0,
       1.4,
       21.5
      ],
      [
       0,
       3,
       12
      ],
      [
       0,
       6,
       0
      ],
      [
       0,
       8,
       -6
      ],
      [
       0,
       8,
       -8
      ]
     ],
     "duration": 16,
     "fov": 42,
     "mobileFov": 62,
     "idleOrbit": 0.03,
     "mobilePullback": 1,
     "exposure": 1.0,
     "petals": 1,
     "ambience": {
      "birds": 0.5,
      "water": 0.2
     },
     "ease": "power1.inOut",
     "couple": "tangga"
    }
   ]
  }
 ]
};
