import { Activity } from './event.js';
import { alert } from './utilities.js'

/*
    Dev note: The seperation of the measurements gained and entered has had to be seperated
    so that events and their associated costs, both measured and entered, can be calculated over
    a number of days. Adjusting by the day proved to cause all values tend to anti-sleep.

    But cookies are a good thing... right?
*/

// How many measurements of an event should we have before we can begin to trust it?
let EVENT_CONFIDENT_THRESHOLD = 1;

export class Profile {

    // ----- Constructors -----
    constructor() {

        // Let's have a bit of flavour while we're at it
        this.my_name = "Humanoid";

        // This shall be the list of user's experiences, building over time.
        this.events = {};
        
        // All humans sleep and it holds a special importance.
        this.sleep = new Activity("Sleep Quality");

        // The last "current energy level" measurement, used to indicate last night's sleep quality
        this.energy_before_sleep = {
            date: null,
            value: null
        }

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
            this.events[name] = new Activity(name, value, false);
        }
    }

    // Create a blank event
    add_event(name) {
        this.events[name] = new Activity(name);
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
                    this.energy_before_sleep = {
                        date: date,
                        value: ending_energy
                    };
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
        this.energy_before_sleep = {
            date: date,
            value: ending_energy
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
        profile["energy_before_sleep"] = this.energy_before_sleep;

        let days = [];
        for (let day in this.days) {
            let tmp = {};
            tmp["date"] = this.days[day].date;
            tmp["events"] = this.days[day].events;
            for (let event in this.days[day].events) {
                // This day may already have been processed for saving.
                // So, if it's already a string, we good.
                if (typeof this.days[day].events[event] === "string") {
                    tmp["events"][event] = this.days[day].events[event];
                }
                else {
                    tmp["events"][event] = this.days[day].events[event].to_json();
                }
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
                let tmp = Activity.from_json(profile_str.events[event]);
                if (tmp !== null)
                    loaded_profile.events[event] = tmp;
            }
            loaded_profile.sleep = Activity.from_json(profile_str.sleep);
            loaded_profile.my_name = profile_str.name;

            // Validating this little object. Can sometimes get lost in transit.
            // ...I should probably look for that bug.
            loaded_profile.energy_before_sleep = profile_str.energy_before_sleep
            try {
                if (typeof(loaded_profile.energy_before_sleep) === "undefined") {
                    loaded_profile.energy_before_sleep = {
                        value: null,
                        date: null
                    }
                } else if(typeof(loaded_profile.energy_before_sleep) === "string") {
                    let yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    yesterday.setHours(0, 0, 0, 0);
                    
                    loaded_profile.energy_before_sleep = {
                        value: parseFloat(loaded_profile.energy_before_sleep),
                        date: yesterday
                    }
                } else if (typeof(loaded_profile.energy_before_sleep) === "object") {
                    // Oooo, we might actually have a valid object here!
                    let yesterday = new Date(loaded_profile.energy_before_sleep.date);
                    yesterday.setHours(0, 0, 0, 0); // Just in case
                    loaded_profile.energy_before_sleep = {
                        value: parseFloat(loaded_profile.energy_before_sleep.value),
                        date: yesterday
                    }              
                }      
            }
            catch (e) {
                console.log(e);
                alert("Error loading last day's sleep info. Please report this bug while " +
                    "I put in a blank value for now.", "danger");
            }


            for (let day in profile_str.days) {
                let tmp = {};
                tmp["date"] = new Date(profile_str.days[day].date);
                tmp["events"] = profile_str.days[day].events;
                for (let event in profile_str.days[day].events) {
                    tmp["events"][event] = Activity.from_json(profile_str.days[day].events[event]);
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

            // This would the first time we find out about a mid-save cock-up.
            // We'll do a quick check just to see if this event is in fact a json string.
            if (typeof this.days[day].events === "string") {
                this.days[day].events = JSON.parse(this.days[day].events);
            }

            this.days[day].events.sort((a, b) => a.name.localeCompare(b.name));
        }
        // If we have days in ascending over of event list size, we'll (likely) save iterations
        let days = this.days;
        days.sort((a, b) => a.events.length - b.events.length);

        // For each day...
        for (let day_name = 0; day_name < days.length; day_name++) {
            const day = days[day_name];

            if (day.events.length == 0) {
                // No events? There's more to life than sleeping.
                
                // If there are no events and no energy expendature, I'm going to bet
                // that they just clicked save by mistake.
                if (day.ending_energy - day.starting_energy != 0) { 

                    // If there are no events, but there is energy expendature, we'll assume
                    // that we're just tracking sleep today.
                    
                    // At the moment, we aren't calculating multiple past blank days.
                    // There shouldn't be any by this point anyway.

                    if (this.energy_before_sleep !== null && this.energy_before_sleep.date != null) {
                        this.sleep.add_value(day.starting_energy - this.energy_before_sleep.value);
                        // ...and reset today.
                        this.energy_before_sleep.value = day.ending_energy;
                        this.energy_before_sleep.date = new Date();
                        this.energy_before_sleep.date.setHours(0, 0, 0, 0);
                    }

                    this.energy_before_sleep = day.ending_energy;
                }
                
                this.days.splice(day_name, 1);
                day_name--;

                continue;
            }

            day.energy_total = day.ending_energy - day.starting_energy;

            // Any events with value provided by the user?
            // Note: If all of them have been provided, we'll end up doing an all-day 
            // adjustment anyway.
            for (let event in day.events) {
                if (day.events[event].has_value()) {
                    day.energy_total -= day.events[event].total_value();
                    this.add_or_update_event(
                        day.events[event].name, 
                        day.events[event].estimate_value()
                        );
                }
            }

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

                let expected_total = 0;
                for (let event in day.events) {
                    let event_name = day.events[event].name;
                    expected_total += this.events[event_name].estimate_value();
                }

                let error_margin = day.energy_total - expected_total;
                let adjustment = error_margin / day.events.length;

                // Adjust each value in the day by an equal share of the energy total
                //let adjustment = day.energy_total / day.events.length;
                for (let event in day.events) {
                    let event_name = day.events[event].name;
                    let old_value = this.events[event_name].estimate_value();
                    day.events[event].values = [];
                    day.events[event].add_value(adjustment + old_value);
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

            // If we have more than one left, we can still calculate it only if all
            // of the remaining events are identical (eg. 2x 1.5h of exercise)
            else if (day.events.length > 1) {
                let all_identical = true;
                let event_name = day.events[0].name;
                for (let event in day.events) {
                    if (day.events[event].name !== event_name) {
                        all_identical = false;
                        break;
                    }
                }

                if (all_identical) {
                    this.add_or_update_event(event_name, day.energy_total / day.events.length);
                    const x = days.splice(day_name, 1);
                    this.have_a_good_think();
                }

            }
        }

    }

}