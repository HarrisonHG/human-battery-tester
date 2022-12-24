import { Event } from './event.js';
import { alert } from './utilities.js'

/*
    Dev note: The seperation of the measurements gained and entered has had to be seperated
    so that events and their associated costs, both measured and entered, can be calculated over
    a number of days. Adjusting by the day proved to cause all values tend to anti-sleep.

    But cookies are a good thing... right?
*/

// How many measurements of an event should we have before we can begin to trust it?
let EVENT_CONFIDENT_THRESHOLD = 5;


export class Profile {

    // ----- Constructors -----
    constructor() {

        // Let's have a bit of flavour while we're at it
        this.my_name = "Humanoid";

        // This shall be the list of user's experiences, building over time.
        this.events = {};
        
        // All humans sleep and it holds a special importance.
        this.sleep = new Event("Sleep Quality");

        // The last "current energy level" measurement, used to indicate last night's sleep quality
        this.energy_before_sleep = null;

        // Keep a record of recent days to calculate averages
        this.days = [];
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

    // Take an array of events and energy measurements and save them for later processing
    // Returns true if the day was added or false if the day's data have already been added
    add_new_day(event_list, starting_energy, ending_energy, overwrite = false) {

        // Check if we already have a day with this date
        for (let day in this.days) {
            if (day.date === new Date()) {
                if (overwrite) {
                    // Replace this day with the new one if it's the same date
                    day.events = event_list;
                    day.starting_energy = starting_energy;
                    day.ending_energy = ending_energy;
                    this.energy_before_sleep = ending_energy;
                    return true;
                }
                else {
                    // The user hasn't confirmed that they want this one overwritten
                    return false;
                }
            }
        }
        
        // Create a new day object
        let day = {
            date: new Date(), // MAYBE: Use a date picker instead?
            events: event_list,
            starting_energy: starting_energy,
            ending_energy: ending_energy
        };

        // Add the day to the list
        this.days.push(day);

        // Note: We don't remove days until they have been fully calculated.

        return true;
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
        let events = new Profile;
        for (let event in this.events) {
            if (this.events[event].values.length >= EVENT_CONFIDENT_THRESHOLD) {
                events.add_event(this.events[event].name)
            }
        }
        return events;
    }

    // Get the number of events in the list
    get_event_count() {
        return Object.keys(this.events).length;
    }

    // ----- Utility Functions -----

    // Prepare the list for saving
    to_json() {
        
        let profile = {};

        let events = {};
        for (let event in this.events) {
            events[event] = this.events[event].to_json();
        }
        profile["events"] = events;
        profile["sleep"] = this.sleep.to_json();
        profile["name"] = this.my_name;

        let save_me = JSON.stringify(profile);
        return save_me;
    }
    
    // Load the list from a JSON object
    static from_json(json) {
        try {
            let loaded_profile = new Profile();
            let profile_str = JSON.parse(json);

            if (profile_str === null) {
                return loaded_profile;
            }
            
            for (let event in profile_str.events) {
                let tmp = Event.from_json(profile_str.events[event]);
                if (tmp !== null)
                    loaded_profile.events[event] = tmp;
            }
            loaded_profile.sleep = Event.from_json(profile_str.sleep);
            loaded_profile.my_name = profile_str.name;

            return loaded_profile;
        }
        catch (e) {
            console.log(e);
            alert("Error loading events from JSON. Please refresh using shift+F5, or wipe memory (sorry!).", 
                "danger");
            return new Profile();
        }
    }

    // Clear the storage in case of problems
    static clear_storage() {
        localStorage.removeItem("events");
    }

}