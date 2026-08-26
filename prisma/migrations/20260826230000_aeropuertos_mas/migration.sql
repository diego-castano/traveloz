-- ──────────────────────────────────────────────────────────────────────────
-- Más aeropuertos IATA para la ficha del pasajero.
--
-- La tabla arrancó con los 18 destinos que TravelOz vende todas las semanas.
-- Alcanzó hasta que salió una cotización a Jamaica: con MBJ sin cargar, el
-- itinerario del PDF decía "MBJ — 11:18 hs / Aeropuerto MBJ (MBJ)". Esta
-- migración suma 89 códigos más — el mapa real de una agencia uruguaya.
--
-- Aditiva y repetible: solo INSERT con ON CONFLICT DO NOTHING, así que se
-- puede correr sobre una base que ya tenga cargados algunos de estos códigos
-- (o los 18 originales) sin pisar nada de lo que haya editado el máster.
--
-- `ciudad` es lo que el pasajero lee en grande, en español. `nombre` es el
-- nombre real del aeropuerto. `terminal` se completa solo cuando el aeropuerto
-- se conoce por un nombre propio corto (Sangster, Heathrow, Malpensa) o cuando
-- la ciudad tiene más de una terminal que hay que distinguir (JFK / Newark,
-- Narita / Haneda, Heathrow / Gatwick).
-- ──────────────────────────────────────────────────────────────────────────

INSERT INTO "Aeropuerto" ("codigo", "ciudad", "nombre", "terminal") VALUES
  -- Caribe
  ('MBJ', 'Montego Bay',            'Aeropuerto Internacional Sangster',                    'Sangster'),
  ('KIN', 'Kingston',               'Aeropuerto Internacional Norman Manley',               'Norman Manley'),
  ('SJU', 'San Juan de Puerto Rico','Aeropuerto Internacional Luis Muñoz Marín',            'Luis Muñoz Marín'),
  ('HAV', 'La Habana',              'Aeropuerto Internacional José Martí',                  'José Martí'),
  ('VRA', 'Varadero',               'Aeropuerto Internacional Juan Gualberto Gómez',        NULL),
  ('SDQ', 'Santo Domingo',          'Aeropuerto Internacional Las Américas',                'Las Américas'),
  ('AUA', 'Aruba',                  'Aeropuerto Internacional Reina Beatriz',               'Reina Beatriz'),
  ('CUR', 'Curazao',                'Aeropuerto Internacional Hato',                        'Hato'),
  ('NAS', 'Nassau',                 'Aeropuerto Internacional Lynden Pindling',             NULL),
  ('SXM', 'St. Maarten',            'Aeropuerto Internacional Princesa Juliana',            'Princesa Juliana'),

  -- México, Centroamérica y norte de Sudamérica
  ('MEX', 'Ciudad de México',       'Aeropuerto Internacional Benito Juárez',               'Benito Juárez'),
  ('SJD', 'Los Cabos',              'Aeropuerto Internacional de Los Cabos',                NULL),
  ('PVR', 'Puerto Vallarta',        'Aeropuerto Internacional Gustavo Díaz Ordaz',          NULL),
  ('SJO', 'San José de Costa Rica', 'Aeropuerto Internacional Juan Santamaría',             'Juan Santamaría'),
  ('LIR', 'Liberia',                'Aeropuerto Internacional Daniel Oduber Quirós',        NULL),
  ('BOG', 'Bogotá',                 'Aeropuerto Internacional El Dorado',                   'El Dorado'),
  ('CTG', 'Cartagena de Indias',    'Aeropuerto Internacional Rafael Núñez',                NULL),
  ('MDE', 'Medellín',               'Aeropuerto Internacional José María Córdova',          'José María Córdova'),
  ('LIM', 'Lima',                   'Aeropuerto Internacional Jorge Chávez',                'Jorge Chávez'),
  ('CUZ', 'Cusco',                  'Aeropuerto Internacional Alejandro Velasco Astete',    NULL),

  -- Sudamérica
  ('COR', 'Córdoba',                'Aeropuerto Internacional Ingeniero Ambrosio Taravella','Pajas Blancas'),
  ('MDZ', 'Mendoza',                'Aeropuerto Internacional Francisco Gabrielli',         'El Plumerillo'),
  ('BRC', 'Bariloche',              'Aeropuerto Internacional Teniente Luis Candelaria',    NULL),
  ('IGR', 'Puerto Iguazú',          'Aeropuerto Internacional Cataratas del Iguazú',        NULL),
  ('USH', 'Ushuaia',                'Aeropuerto Internacional Malvinas Argentinas',         NULL),
  ('ASU', 'Asunción',               'Aeropuerto Internacional Silvio Pettirossi',           'Silvio Pettirossi'),
  ('VVI', 'Santa Cruz de la Sierra','Aeropuerto Internacional Viru Viru',                   'Viru Viru'),
  ('GYE', 'Guayaquil',              'Aeropuerto Internacional José Joaquín de Olmedo',      NULL),
  ('UIO', 'Quito',                  'Aeropuerto Internacional Mariscal Sucre',              'Mariscal Sucre'),
  ('SSA', 'Salvador de Bahía',      'Aeropuerto Internacional Luís Eduardo Magalhães',      NULL),
  ('REC', 'Recife',                 'Aeropuerto Internacional de Guararapes',               'Guararapes'),
  ('FOR', 'Fortaleza',              'Aeropuerto Internacional Pinto Martins',               'Pinto Martins'),
  ('NAT', 'Natal',                  'Aeropuerto Internacional Aluízio Alves',               NULL),
  ('MCZ', 'Maceió',                 'Aeropuerto Internacional Zumbi dos Palmares',          'Zumbi dos Palmares'),
  ('BSB', 'Brasilia',               'Aeropuerto Internacional Juscelino Kubitschek',        NULL),
  ('POA', 'Porto Alegre',           'Aeropuerto Internacional Salgado Filho',               'Salgado Filho'),
  ('CWB', 'Curitiba',               'Aeropuerto Internacional Afonso Pena',                 'Afonso Pena'),
  ('CNF', 'Belo Horizonte',         'Aeropuerto Internacional de Confins',                  'Confins'),

  -- Estados Unidos
  ('MCO', 'Orlando',                'Aeropuerto Internacional de Orlando',                  NULL),
  ('FLL', 'Fort Lauderdale',        'Aeropuerto Internacional de Fort Lauderdale-Hollywood',NULL),
  ('JFK', 'Nueva York',             'Aeropuerto Internacional John F. Kennedy',             'JFK'),
  ('EWR', 'Nueva York',             'Aeropuerto Internacional de Newark Liberty',           'Newark'),
  ('LAX', 'Los Ángeles',            'Aeropuerto Internacional de Los Ángeles',              NULL),
  ('LAS', 'Las Vegas',              'Aeropuerto Internacional Harry Reid',                  NULL),
  ('SFO', 'San Francisco',          'Aeropuerto Internacional de San Francisco',            NULL),
  ('ATL', 'Atlanta',                'Aeropuerto Internacional Hartsfield-Jackson',          'Hartsfield-Jackson'),
  ('IAH', 'Houston',                'Aeropuerto Intercontinental George Bush',              'George Bush'),
  ('DFW', 'Dallas',                 'Aeropuerto Internacional de Dallas-Fort Worth',        NULL),
  ('ORD', 'Chicago',                'Aeropuerto Internacional O''Hare',                     'O''Hare'),

  -- Europa
  ('ORY', 'París',                  'Aeropuerto de Orly',                                   'Orly'),
  ('AMS', 'Ámsterdam',              'Aeropuerto de Schiphol',                               'Schiphol'),
  ('LHR', 'Londres',                'Aeropuerto de Heathrow',                               'Heathrow'),
  ('LGW', 'Londres',                'Aeropuerto de Gatwick',                                'Gatwick'),
  ('FRA', 'Fráncfort',              'Aeropuerto de Fráncfort del Meno',                     NULL),
  ('MUC', 'Múnich',                 'Aeropuerto de Múnich Franz Josef Strauss',             NULL),
  ('ZRH', 'Zúrich',                 'Aeropuerto de Zúrich',                                 NULL),
  ('VIE', 'Viena',                  'Aeropuerto de Viena-Schwechat',                        'Schwechat'),
  ('MXP', 'Milán',                  'Aeropuerto de Malpensa',                               'Malpensa'),
  ('VCE', 'Venecia',                'Aeropuerto Marco Polo',                                'Marco Polo'),
  ('NAP', 'Nápoles',                'Aeropuerto de Capodichino',                            'Capodichino'),
  ('ATH', 'Atenas',                 'Aeropuerto Internacional Eleftherios Venizelos',       NULL),
  ('IST', 'Estambul',               'Aeropuerto de Estambul',                               NULL),
  ('DUB', 'Dublín',                 'Aeropuerto de Dublín',                                 NULL),
  ('BRU', 'Bruselas',               'Aeropuerto de Bruselas-Zaventem',                      'Zaventem'),
  ('CPH', 'Copenhague',             'Aeropuerto de Kastrup',                                'Kastrup'),
  ('ARN', 'Estocolmo',              'Aeropuerto de Arlanda',                                'Arlanda'),
  ('OSL', 'Oslo',                   'Aeropuerto de Gardermoen',                             'Gardermoen'),
  ('HEL', 'Helsinki',               'Aeropuerto de Helsinki-Vantaa',                        'Vantaa'),
  ('PRG', 'Praga',                  'Aeropuerto Václav Havel',                              NULL),
  ('BUD', 'Budapest',               'Aeropuerto Internacional Ferenc Liszt',                NULL),
  ('WAW', 'Varsovia',               'Aeropuerto Chopin',                                    'Chopin'),

  -- Medio Oriente, Asia, Oceanía y África
  ('DXB', 'Dubái',                  'Aeropuerto Internacional de Dubái',                    NULL),
  ('DOH', 'Doha',                   'Aeropuerto Internacional Hamad',                       'Hamad'),
  ('AUH', 'Abu Dabi',               'Aeropuerto Internacional Zayed',                       NULL),
  ('TLV', 'Tel Aviv',               'Aeropuerto Internacional Ben Gurión',                  'Ben Gurión'),
  ('CAI', 'El Cairo',               'Aeropuerto Internacional de El Cairo',                 NULL),
  ('BKK', 'Bangkok',                'Aeropuerto de Suvarnabhumi',                           'Suvarnabhumi'),
  ('SIN', 'Singapur',               'Aeropuerto de Changi',                                 'Changi'),
  ('KUL', 'Kuala Lumpur',           'Aeropuerto Internacional de Kuala Lumpur',             NULL),
  ('HKG', 'Hong Kong',              'Aeropuerto Internacional de Hong Kong',                NULL),
  ('NRT', 'Tokio',                  'Aeropuerto Internacional de Narita',                   'Narita'),
  ('HND', 'Tokio',                  'Aeropuerto Internacional de Haneda',                   'Haneda'),
  ('ICN', 'Seúl',                   'Aeropuerto Internacional de Incheon',                  'Incheon'),
  ('DPS', 'Bali',                   'Aeropuerto Internacional Ngurah Rai',                  'Ngurah Rai'),
  ('SYD', 'Sídney',                 'Aeropuerto Kingsford Smith',                           'Kingsford Smith'),
  ('MEL', 'Melbourne',              'Aeropuerto de Tullamarine',                            'Tullamarine'),
  ('AKL', 'Auckland',               'Aeropuerto Internacional de Auckland',                 NULL),
  ('JNB', 'Johannesburgo',          'Aeropuerto Internacional O. R. Tambo',                 'O. R. Tambo'),
  ('CPT', 'Ciudad del Cabo',        'Aeropuerto Internacional de Ciudad del Cabo',          NULL)
ON CONFLICT ("codigo") DO NOTHING;
