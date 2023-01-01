import { Event } from './event.js';
import { Profile } from './profile.js';
import { alert, get_battery_gauge_picture } from './utilities.js'

// ----- Main -----

// Events list according to the user.
let my_profile = new Profile();

// ----- UI -----
const DEFAULT_ENERGY_LEVEL = 50;
let morning_energy_level = null;
let current_energy_level = null;

// ----- Saving & Loading -----

// Save events to the user's local storage
function save_events() {

    // Read the UI
    let todays_events = parse_ui();
        
    // If the user added 0 events, they may have fat-fingered the save button
    if (todays_events.length == 0
        && morning_energy_level == DEFAULT_ENERGY_LEVEL
        && current_energy_level == DEFAULT_ENERGY_LEVEL) {
        alert("Please add at least one event, or set your energy levels to save.",
         "warning");
        
        return;
    }

    console.log("Saving profile:");
    console.log(my_profile);

    // Create a day, then hand it to the profile to think about later
    let today = new Date();

    if (!my_profile.add_new_day(
        new Date(), todays_events, morning_energy_level, current_energy_level, false )
        ) {
        if ( confirm("You've already logged today's events. Do you want to overwrite them?" )) {
            my_profile.add_new_day(
                new Date(), todays_events, morning_energy_level, current_energy_level, true
            );
        }
        else {
            return;
        }
    }

    // Well, at least they did something. So let's count this day.
    my_profile.energy_before_sleep = {
        date: today,
        value: current_energy_level
    }

    if (my_profile.energy_before_sleep == null) {
        my_profile.sleep.add_value( morning_energy_level );
    }
    else {
        my_profile.sleep.add_value( morning_energy_level - my_profile.energy_before_sleep.value);
    }

    // Before we save, let's have a good think.
    my_profile.have_a_good_think();
    console.log("After thinking:");
    console.log(my_profile);

    // Shove some goodies into local storage.
    localStorage.setItem("events", my_profile.to_json());

    show_energy_results(true);
    document.getElementById("saveEventsBtn").disabled=true;
    alert("Saved!", "success");
}

// Load events from the user's local storage
// Automatically applies defaults for missing values and/or first time use.
export function load_events() {

    my_profile = Profile.from_json(localStorage.getItem("events"));

    if (my_profile === null) {
        // Completely new. Leave the.
        my_profile = new Profile();
    }

    // Summarize the load process
    console.log("Loaded profile:");
    console.log(my_profile);

    console.log("Loaded " + my_profile.get_event_count() + " ativities and " + 
        my_profile.days.length + " days");

    // Update the UI
    set_ui_on_load();

    // Confirmation details
    if (my_profile.get_event_count() == 0 && my_profile.days.length == 0) {
        alert("Welcome to the Human Battery Tester! To get started, add some activities " + 
            "and log some events. Keep it up for several days and your energy costs will " +
            "be automatically calculated for you.", "info");
    }
    else {
        alert("Loaded " + my_profile.get_event_count() + " measured ativities and " + 
            my_profile.days.length + " unprocessed days", 'success');
    }
}

/// TODO: Fix this. Make it work here instead of in the HTML.
// function remove_event_row(btn) {
//     let row = btn.parentNode.parentNode;
//     row.parentNode.removeChild(row);
// }

// Download a copy of the user's data
function create_backup() {

    save_events();

    // Package some data, then download it as a file.
    let backup_json = my_profile.to_json();
    let backup_blob = new Blob([backup_json], {type: "application/json"});
    let backup_url = URL.createObjectURL(backup_blob);
    let backup_link = document.createElement("a");
    backup_link.href = backup_url;
    backup_link.download = "energy_tracker_backup.json";
    backup_link.click();
}

// Restore the user's data from a backup file
function restore_backup() {
    // Since this overwrites the local storage, let's double check
    if (!confirm(
        "Are you sure you want to restore from a backup? This will overwrite your current data."
        )) {
        return;
    }

    // Ask the user for a file
    let file_input = document.createElement("input");
    file_input.type = "file";
    file_input.accept = "application/json";
    file_input.onchange = function() {
        let file = file_input.files[0];
        let reader = new FileReader();
        reader.onload = function() {
            try {
                //let backup = JSON.parse(reader.result);
                localStorage.setItem("events", reader.result);
                load_events();
            }
            catch (e) {
                alert("Can't read that file. Make sure it's a valid backup file.");
            }
        }
        reader.readAsText(file);
    }
    file_input.click();
    
    document.getElementById("saveEventsBtn").disabled=false;
}

// Delete everything!
function clear_all_events() {

    // Confirm the user wants to YEET ALL OF THEIR DATA INTO THE ABYSS
    if (!confirm("Are you absolutely deifnitely sure that you want to start from scratch?")) {
        return;
    }

    // Clear the current data
    my_profile = new Profile();
    morning_energy_level = null;
    current_energy_level = null;

    // Clean up the local storage
    localStorage.clear();

    // Easiest way to clear the UI is to reload the page
    location.reload();
}

// ----- Utilities & UI -----

// Time to calculate the user's energy expendature
function show_energy_results(confident_only = false) {

    let local_event_list = my_profile;
    if (confident_only) {
        let local_event_list = my_profile.get_confident_events();
        if (local_event_list.get_event_count() == 0) {
            document.getElementById("resultAreaFillerText").innerHTML = 
            "We don't have enough data to reliably calculate your energy expendature yet. " +
                "Come back each day and we'll keep measuring your activity costs.";
            return;
        }
    }

    // Get the top 3 positive events
    let ordered_events = local_event_list.get_events_by_value();
    let top_three = ordered_events.slice(0, 3);
    for (let i = 0; i < top_three.length; i++) {
        if (top_three[i].estimate_value() <= 0) {
            // Remove the current event and all events after it, since we've 
            //  only got negative events left
            top_three = top_three.slice(0, i);
            break;
        }
    }

    // Get the top 3 negative events
    let bottom_three = ordered_events.slice(-3, ordered_events.length);
    for (let i = bottom_three.length-1; i >= 0; i--) {
        if (bottom_three[i].estimate_value() >= 0) {
            // Remove the current event and all events after it, since we've
            //  only got positive events left
            if (i === bottom_three.length-1) {
                bottom_three = [];
            } else {
                bottom_three = bottom_three.slice(i + 1);
            }
          
            break;
        }
    }
    bottom_three.reverse();

    // Get the top 3 impactful events
    let top_three_impact = local_event_list.get_events_by_impact();
    top_three_impact = top_three_impact.slice(0, 3);

    // What's the average sleep value?
    let average_sleep = my_profile.sleep.estimate_value();

    // We have our data. Let's make some tables!

    // Top 3 positive events
    let top_three_table = document.getElementById("rechargeTable").getElementsByTagName('tbody')[0];
    top_three_table.innerHTML = "";
    if (top_three.length === 0) {
        top_three_table.innerHTML = 
            "<tr><td colspan='2'>You're not a single-use battery bro. You're worth " + 
            "more than that. Buy yourself an ice-cream and relax!</td></tr>";
    }
    else {
        for (let i = 0; i < top_three.length; i++) {
            let row = top_three_table.insertRow(-1);
            let name_cell = row.insertCell(0);
            let value_cell = row.insertCell(1);
            name_cell.innerHTML = top_three[i].name;
            value_cell.innerHTML = Math.round(top_three[i].estimate_value()) + "%";
        }        
    }

    // Top 3 negative events
    let bottom_three_table = document.getElementById("costTable").getElementsByTagName('tbody')[0];
    bottom_three_table.innerHTML = "";
    if (bottom_three.length === 0) {
        bottom_three_table.innerHTML = 
            "<tr><td colspan='2'>You have no draining events? Sick! How do you manage it, man? " + 
            "Can you do a Ted talk or something, because there are plenty strugglig out there, bro." +
            "</td></tr>";
    }
    else {
        for (let i = 0; i < bottom_three.length; i++) {
            let row = bottom_three_table.insertRow(-1);
            let name_cell = row.insertCell(0);
            let value_cell = row.insertCell(1);
            name_cell.innerHTML = bottom_three[i].name;
            value_cell.innerHTML = Math.round(bottom_three[i].estimate_value()) + "%";
        }        
    }

    // Top 3 impactful events
    let top_three_impact_table = document.getElementById("impactTable").getElementsByTagName('tbody')[0];
    top_three_impact_table.innerHTML = "";
    if (top_three_impact.length === 0) {
        top_three_impact_table.innerHTML = 
            "<tr><td colspan='2'>Nothing happened. At all. Ever.</td></tr>";
    }
    else {
        for (let i = 0; i < top_three_impact.length; i++) {
            let row = top_three_impact_table.insertRow(-1);
            let name_cell = row.insertCell(0);
            let value_cell = row.insertCell(1);
            name_cell.innerHTML = top_three_impact[i].name;
            value_cell.innerHTML = Math.round(top_three_impact[i].impact_value()) + "%";
        }
    }

    // Show the sleep quality
    document.getElementById("sleepQuality").innerHTML = average_sleep;

    // Finally, display a table of events and energy levels
    let result_events_table = document.getElementById("generalResultTable").getElementsByTagName('tbody')[0];
    result_events_table.innerHTML = "";
    ordered_events.forEach(function(event) {
        let row = result_events_table.insertRow(-1);
        let name_cell = row.insertCell(0);
        let value_cell = row.insertCell(1);
        name_cell.innerHTML = event.name;
        value_cell.innerHTML = Math.round(event.estimate_value()) + "%";
    });

    document.getElementById("resultArea").hidden = false;
    document.getElementById("resultAreaBlank").hidden = true;

    // Scroll to the results and hide the "How am I doing?" button
    document.getElementById("resultArea").scrollIntoView();
    document.getElementById("calculateBtn").hidden = true;

}

// Append a new row to the events table
function add_event_row() {
    let table = document.getElementById("eventsTable");
    let row = table.insertRow(-1);
    row.classList.add("d-flex");
    let name_cell = row.insertCell(0);
    let value_cell = row.insertCell(1);
    let remove_cell = row.insertCell(2);

    name_cell.classList.add("col");
    value_cell.classList.add("col-2");
    remove_cell.classList.add("col-1");

    name_cell.innerHTML = 
        "<div class='input-group'>" +
        "   <input type='text' class='eventNames form-control' list='previousEvents' placeholder='Oh snap! Then what?'>" +
        "   <div class='input-group-append'>" +
        "       <select class='form-select input-group-select eventNumbers' type='button'>" +
        "           <option value='1' selected>Once</option>" +
        "           <option value='2'>Twice</option>" +
        "           <option value='3'>Thrice</option>" +
        "           <option value='5'>A lot!</option>" +
        "       </select>" +
        "   </div>" +
        "</div>";

    value_cell.innerHTML = "<input type='number' class='eventValues form-control' " + 
        "placeholder='auto'  min='-100' max='100'>";
    remove_cell.innerHTML = "<button class='removeEventBtn btn-danger form-control' " + 
        "onclick=\"remove_event_row(this);\">-</button>";

    /// TODO: Fix this. Make it work here instead of in the HTML.
    // Add an event listener to the remove button
    // let remove_btn = remove_cell.getElementsByClassName("removeEventBtn")[0];
    // remove_btn.addEventListener("click", remove_event_row (row));
}

// Read all the things from the UI
// Returns an array of events
function parse_ui() {

    let todays_events = [];

    // Events
    let event_names = document.getElementsByClassName("eventNames");
    let event_numbers = document.getElementsByClassName("eventNumbers");
    let event_values = document.getElementsByClassName("eventValues");
    for (let i = 0; i < event_names.length; i++) {

        // If the event name is empty, don't add it
        if (event_names[i].value == "") {
            continue;
        }

        for (let j = 0; j < event_numbers[i].value; j++) {
            // If the event value is empty, add it as an auto event and we'll calculate it later
            if (event_values[i].value == "") {
                todays_events.push(new Event(event_names[i].value, "auto"));
            }
            else {
                todays_events.push(new Event(event_names[i].value, event_values[i].value));
            }
        }
    }

    // Sleep
    morning_energy_level = document.getElementById("batteryLevelStart").value;
    current_energy_level = document.getElementById("batteryLevelEnd").value;

    return todays_events;
}

function set_ui_on_load() {
    
    // Get yesterday's date
    let yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // What was yesterday's energy level?
    if (my_profile.energy_before_sleep !== null 
        && my_profile.energy_before_sleep !== undefined
        && my_profile.energy_before_sleep.value !== null
        && my_profile.energy_before_sleep.date == yesterday
        ) {
        document.getElementById("yesterdaysEnergyMention").innerHTML = 
            "You ended yesterday at " + my_profile.energy_before_sleep.value + "%.";
    }
    else {
        document.getElementById("yesterdaysEnergyMention").innerHTML = "";
    }

    // What events have been added before?
    let event_names = my_profile.get_event_names();

    // Add the events to the UI for ease of access
    let previous_events = document.getElementById("previousEvents");
    previous_events.innerHTML = "";
    for (let i = 0; i < event_names.length; i++) {
        let option = document.createElement("option");
        option.value = event_names[i];
        previous_events.appendChild(option);
    }
}

// Update the UI with the current events (deprecated)
function update_ui() {
    
        // Sleep
        document.getElementById("batteryLevelStart").value = energy_before_sleep;
        document.getElementById("batteryLevelEnd").value = current_energy_level;
    
        if (energy_before_sleep !== null) {
            document.getElementById("batteryLevelStart").value = energy_before_sleep;
            document.getElementById("yesterdaysEnergyMention").innerHTML = 
                "Yesterday's energy level was " + energy_before_sleep + "%.";
        }
        else {
            document.getElementById("yesterdaysEnergyMention").innerHTML = 
                "Yesterday's energy level is unknown.";
        }

        // Events
        let event_names = document.getElementsByClassName("eventNames");
        let event_values = document.getElementsByClassName("eventValues");
        let events = my_profile.get_events_by_value();
        for (let i = 0; i < event_names.length; i++) {
            event_names[i].value = events[i].name;
            event_values[i].value = events[i].estimate_value();
        }
}

// ----- Event Listeners -----
//document.getElementById("loadEventsBtn").addEventListener("click", load_events);
document.getElementById("saveEventsBtn").addEventListener("click", save_events);
document.getElementById("addEventBtn").addEventListener("click", add_event_row);
document.getElementById("clearEventsBtn").addEventListener("click", clear_all_events);
document.getElementById("calculateBtn").addEventListener("click", show_energy_results, true);
document.getElementById("createBackupBtn").addEventListener("click", create_backup);
document.getElementById("restoreBackupBtn").addEventListener("click", restore_backup);

// We want to do a quick save whenever the user leaves the page
// window.addEventListener("beforeunload", function (e) {
//     save_events();
// });
