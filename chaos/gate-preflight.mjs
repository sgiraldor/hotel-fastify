import { URL_PERMITIDA, urlPermitida } from './gate-policy.mjs';

const actual = process.env.HOTEL_BASE_URL || '';

if (!urlPermitida(actual)) {
  console.error(`CAUSA: HOTEL_BASE_URL rechazada. Solo se admite ${URL_PERMITIDA}`);
  process.exit(1);
}

console.log(`HOTEL_BASE_URL=${URL_PERMITIDA}`);
