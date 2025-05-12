import { Country } from './Country';

export class Continent {
  countries: Country[];

  constructor(countries: Country[] = []) {
    this.countries = countries;
  }
}
