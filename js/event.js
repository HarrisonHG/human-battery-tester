
// The maximum number of values to store for an event
let EVENT_MEMORY_SIZE = 10;

export class Event {

    // ----- Constructors -----
    constructor(name, value = null, fixed = false) {
        this.name = name;
        this.values = [];
        
        if (value === null) {
            this.fixed_value = null;
        } else if (fixed) {
            this.fixed_value = value;
        }
        else {
            this.values.push(value);
            this.fixed_value = null;
        }

        this.note = "";
    }

    // ----- Getters and Setters -----

    // Add a value to the event
    add_value(value) {

        while (this.values.length >= EVENT_MEMORY_SIZE) {
            this.values.shift();
        }

        if (value != "auto") {
            value = parseFloat(value);
        } 

        this.values.push(value);
    }

    // Set a fixed value for this event
    override_value(value) {
        this.fixed_value = value;
    }

    // Remove the fixed value for this event
    remove_override() {
        this.fixed_value = null;
    }

    set_note(note) {
        this.note = note;
    }


    // ----- Common Overloads -----
    toString() {
        return this.name;
    }

    valueOf() {
        return this.estimate_value();
    }

    // ----- Event Functions -----

    // Get the average value of the event
    estimate_value() {

        // Fixed value takes priority
        if (this.fixed_value !== null) {
            return this.fixed_value;
        }

        // If there are no values, return 0
        if (this.values.length === 0) {
            return 0;
        }

        // If it's not fixed, get the average of all values
        let total = 0;
        for (let key in this.values) {
            total += parseFloat(this.values[key]);
        }
        return total / Object.keys(this.values).length;
    }

    // Get the total impact of the event
    // This is the sum of all values in absolute
    impact_value() {
        
        // Fixed value takes priority
        if (this.fixed_value !== null) {
            return this.fixed_value;
        }

        // If there are no values, return 0
        if (this.values.length === 0) {
            return 0;
        }

        // If it's not fixed, get the absolute sum of all values
        let total = 0;
        for (let key in this.values) {
            total += parseFloat(Math.abs(this.values[key]));
        }
        return total;
        
    }


    // ----- Utility Functions -----

    // Prepare the event for saving
    to_json() {
        return JSON.stringify({
            name: this.name,
            values: this.values,
            fixed_value: this.fixed_value,
            note: this.note
        });
    }

    // Load an event from a JSON string
    static from_json(json) {

        // Sometimes... I hate loose typing
        if (json === null) {
            return null;
        }

        let obj = JSON.parse(json);
        let event = new Event(obj.name, obj.values, obj.fixed_value);
        event.note = obj.note;
        return event;
    }
}