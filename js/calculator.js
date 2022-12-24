import { Profile } from './profile.js';


export calculate (Profile)


// Simple class to hold equations that havent been solved yet
class incomplete_equation {
    constructor(names, values, result) {

        // Validation: names and values must be arrays of the same length
        if (!Array.isArray(names) || !Array.isArray(values)) {
            throw "Names and values must be arrays";
        }

        if (names.length != values.length) {
            throw "Names and values must be arrays of the same length";
        }

        this.names = names;
        this.values = values;
        this.result = result;
    }
}

export class Calculator {

    // ----- Constructors -----
    constructor() {
        this.incomplete_combinations = [];
    }

    // ----- Mathsy Methods -----

    // Add anequation using names and values
    add_equation(names, values, result) {
        this.incomplete_combinations.push(new incomplete_equation(names, values, result));
    }

    // Add an equation using an incomplete_equation object
    add_equation(equation) {
        // Validation: equation must be an incomplete_equation
        if (!(equation instanceof incomplete_equation)) {
            throw "Equation must be an incomplete_equation";
        }

        this.incomplete_combinations.push(equation);
    }

    // Pass over the equations and see if any more names can be solved for
    calculate() {

        // A list of boiled-down combinations that we would like to solve for
        class Combination {
            constructor(names, total) {

                // Validation: names must be an array
                if (!Array.isArray(names)) {
                    throw "Names must be an array";
                }
                this.names = names;
                this.total = total;
            }
        }
        let combinations = [];

        // A list of names that we have solved for
        class SolvedName {
            constructor(name, value) {
                this.name = name;
                this.value = value;
            }
        }
        let solved_names = [];

        // For each equation...
        for (let i = 0; i < this.incomplete_combinations.length; i++) {
                
            // Mark off the names that we have solved for
            let names = this.incomplete_combinations[i].names;
            for (let j = 0; j < names.length; j++) {
                for (let k = 0; k < solved_names.length; k++) {
                    if (names[j] == solved_names[k].name) {
                        names[j] = solved_names[k].value;
                    }
                }
            }

        }
    }
}