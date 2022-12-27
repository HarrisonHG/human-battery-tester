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
    add_new_day(date, event_list, starting_energy, ending_energy, overwrite = false) {

        // Check if we already have a day with this date
        for (let day in this.days) {
            if (day.date === date) {
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
            date: date, // MAYBE: Use a date picker instead?
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

        this.events[name] = null;
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

        // Also get the event names from the days array
        // Not just for convenience - this is needed to calculate averages
        for (let day in this.days) {
            for (let event in this.days[day].events) {
                if (!names.includes(this.days[day].events[event].name))
                    names.push(this.days[day].events[event].name);
            }
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

    // Search for a specific event given its name
    get_event(name) {
        for (let event in this.events) {
            if (event.toString() === name) {
                return this.events[event];
            }
        }
        return null;
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

        let days = [];
        for (let day in this.days) {
            let tmp = {};
            tmp["date"] = this.days[day].date;
            tmp["events"] = this.days[day].events;
            for (let event in this.days[day].events) {
                tmp["events"][event] = this.days[day].events[event].to_json();
            }
            tmp["starting_energy"] = this.days[day].starting_energy;
            tmp["ending_energy"] = this.days[day].ending_energy;
            days.push(tmp);
        }

        profile["days"] = this.days;
        
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

            for (let day in profile_str.days) {
                let tmp = {};
                tmp["date"] = new Date(profile_str.days[day].date);
                tmp["events"] = profile_str.days[day].events;
                for (let event in profile_str.days[day].events) {
                    tmp["events"][event] = Event.from_json(profile_str.days[day].events[event]);
                }
                tmp["starting_energy"] = profile_str.days[day].starting_energy;
                tmp["ending_energy"] = profile_str.days[day].ending_energy;
                loaded_profile.days.push(tmp);
            }

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

    // ----- Calculations -----

    // Pass over the days and see if any more values can be calculated
    have_a_good_think() {

        // Events are the pre-calculated stuff

        // Days are what we'll be passing over in the hopes of finding more values
        for (let day in this.days) {
            this.days[day].events.sort((a, b) => a.name.localeCompare(b.name));
        }
        // If we have days in ascending over of event list size, we'll (likely) save iterations
        let days = this.days;
        days.sort((a, b) => a.events.length - b.events.length);

        // For each day...
        for (let day in days) {
            let day_name = day;
            day = days[day];

            if (day.events.length == 0) {
                // No events? There's more to life than sleeping.
                
                // If there are no events and no energy expendature, I'm going to bet
                // that they just clicked save game by mistake.
                if (day.starting_energy - day.ending_energy == 0 && day.events.length == 0) { 
                    this.days.splice(day_name, 1);
                }

                // If there are no events, but there is energy expendature, we'll assume
                // that we're just tracking sleep today.
                else if (day.events.length == 0) {
                    day.energy_total = day.starting_energy - day.ending_energy;
                    this.sleep.add_value(day.starting_energy - this.energy_before_sleep);
                    this.energy_before_sleep = day.ending_energy;
                }

                continue;
            }

            day.energy_total = day.ending_energy - day.starting_energy;

            // If we know all of the values for each event in the day, we'll be doing an all-day 
            //  adjustment
            let all_day_adjustment = true;
            if (this.get_event_count() == 0 || this.events == {}) {
                all_day_adjustment = false;
            }
            else {
                for (let event in day.events) {
                    if (!(day.events[event].name in this.events)) {
                        all_day_adjustment = false;
                        break;
                    }
                }
            }

            if (all_day_adjustment) {
                // Note: the below could be done in much fewer lines, but my god is it a
                //  pain to keep mental note of all the arrays in objects in arrays in objects.
                //  So I'm going back to the classic new-parameter-per-line style.
                //  Sorry not sorry.

                // Adjust each value in the day by an equal share of the energy total
                let adjustment = day.energy_total / day.events.length;
                for (let event in day.events) {
                    let event_name = day.events[event].name;
                    let old_value = this.events[event_name].values.slice(-1)[0];
                    day.events[event].values = [];
                    day.events[event].add_value(old_value + adjustment);
                }

                // Add adjusted values to the profile's own event list
                for (let event in day.events) {
                    this.events[day.events[event].name].values.push(
                        day.events[event].values.slice(-1)[0]
                        );
                }

                // Job done. We can forget this day now.
                days.splice(day_name, 1);
                continue;
            }

            // If we don't know all of the values in a day, we'll take it one event at a time
            //  and see if we can find any more values

            // For each event in the day, check if we know its value. If we do, 
            //  remove the event from the day and subtract its value from the day's energy total
            if (this.get_event_count() > 0) {
                for (let event in day.events) {
                    let tmp_event = this.get_event(day.events[event].name);
                    if (tmp_event !== null ) {
                        day.energy_total -= tmp_event.estimate_value();
                        day.events.splice(event, 1);
                    }
                }
            }

            // We now have a number of events left in the day, and a total energy value
            // If we happend to have only one left, we have a new event-value pair!
            if (day.events.length === 1) {
                this.add_or_update_event(day.events[0].name, day.energy_total);
                const x = days.splice(day_name, 1);

                // With this new information, we can now go back and check the other days
                // in case it shines a light on any of them
                this.have_a_good_think();
            }

            /// TODO: Use combinations of events to find more values            
            
        }

    }

}