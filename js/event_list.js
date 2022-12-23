import { Event } from './event.js';

// How many measurements of an event should we have before we can begin to trust it?
let EVENT_CONFIDENT_THRESHOLD = 5;

export class EventList {

    // ----- Constructors -----
    constructor() {
        this.events = {};
    }

    // ----- Getters and Setters -----

    // "Upsert" an event
    add_or_update_event(name, value) {

        // Try to update an existing one first
        for (let event in this.events) {
            if (event.toString() === name) {

                // Found the name, but if the value is null, don't add it
                if (value === null || value === "" || value === undefined) {
                    return;
                }

                this.events[event].add_value(value);
                //this.events[name].add_value(value);
                return;
            }
        }

        // Not found. Add a new one
        if (value === null || value === "" || value === undefined) {
            // ...without a starting value
            this.add_event(name);
        }
        else {
            /// ...with a starting value
            this.events[name] = new Event(name, value, false);
        }
    }

    // Create a blank event
    add_event(name) {
        this.events[name] = new Event(name);
    }

    // Remove an event from the list
    remove_event(name) {
        delete this.events[name];
    }

    // Clean the list of events
    clear_events() {
        this.events = {};
    }

    // Get an ordered list of events
    get_events_by_value(ascending = false) {
        let events = Object.values(this.events);
        events.sort((a, b) => a.estimate_value() - b.estimate_value());
        if (!ascending) {
            events.reverse();
        }
        return events;
    }

    // Get a different ordered list of events
    get_events_by_impact(ascending = false) { 
        let events = Object.values(this.events);
        events.sort((a, b) => a.impact_value() - b.impact_value());
        if (!ascending) {
            events.reverse();
        }
        return events;
    }

    // Get a list of unique event names
    get_event_names() {
        let names = [];
        for (let event in this.events) {
            if (!names.includes(event))
                names.push(event);
        }
        return names;
    }

    // Get a list of events with "auto" as the last value
    get_events_in_need_of_values() {
        let events = [];
        for (let event in this.events) {
            if (this.events[event].values.slice(-1)[0] == "auto")
                events.push(this.events[event]);
        }
        return events;
    }

    // Return a new EventList that ONLY contains events that have enough values to be confident about
    get_confident_events() {
        let events = new EventList;
        for (let event in this.events) {
            if (this.events[event].values.length >= EVENT_CONFIDENT_THRESHOLD) {
                events.add_event(this.events[event].name)
            }
        }
        return events;
    }

    // ----- Utility Functions -----

    // Get the number of events in the list
    get_event_count() {
        return Object.keys(this.events).length;
    }

    // Prepare the list for saving
    to_json() {
        let events = {};
        for (let event in this.events) {
            events[event] = this.events[event].to_json();
        }
        let save_me = JSON.stringify(events);
        return save_me;
    }
    
    // Load the list from a JSON object
    static from_json(json) {
        try {
            let events = new EventList();
            let events_str = JSON.parse(json);
            for (let event in events_str) {
                let tmp = Event.from_json(events_str[event]);
                if (tmp !== null)
                    events.events[event] = tmp;
            }
            return events;
        }
        catch (e) {
            console.log(e);
            alert("Error loading events from JSON. Please refresh using shift+F5 and try again.");
            return new EventList();
        }
    }

    // Clear the storage in case of problems
    static clear_storage() {
        localStorage.removeItem("events");
    }

}