import { Activity } from './activity.js';
import { Profile } from './profile.js';
import { 
    alert, get_battery_gauge_picture, get_battery_gauge_descriptor, clamp 
} from './utilities.js'

// ----- Main -----

// Events list according to the user.
var my_profile = new Profile();

// ----- UI -----
var DEFAULT_ENERGY_LEVEL = 50;
var morning_energy_level = null;
var current_energy_level = null;

// ----- Settings -----
var user_options_default = { 
    ask_questions: false,
    show_running_total: false
}
var user_options = user_options_default;

// ----- Saving & Loading -----

// Save JUST the settings
// They will be loaded along with the events in load_events()
function save_settings() {
    localStorage.setItem("settings", JSON.stringify(user_options));
}

// Save events to the user's local storage
function save_events() {

    // If it's today, let's just make sure the user wants to add another day.
    if (my_profile.energy_before_sleep != null && my_profile.energy_before_sleep.date != null) {
        if (my_profile.energy_before_sleep.date.getTime() == new Date().getTime()) {
            if (!confirm("You've already logged today's events. Do you want to add another day?")) {
                return;
            }
        }
    }
    
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
    today.setHours(0,0,0,0);

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
    save_settings();

    show_energy_results(true);
    document.getElementById("saveEventsBtn").disabled=true;
    document.getElementById("saveEventsBtnAdvanced").disabled=true;
    alert("Saved!", "success");
}

// Load events from the user's local storage
// Automatically applies defaults for missing values and/or first time use.
export function load_events() {

    my_profile = Profile.from_json(localStorage.getItem("events"));
    my_profile = my_profile == null ? new Profile() : my_profile;
    user_options = JSON.parse(localStorage.getItem("settings"));    
    user_options = user_options == null ? user_options_default: user_options ;

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
        if (typeof(my_profile.energy_before_sleep.date) == "string") {
            my_profile.energy_before_sleep.date = new Date(my_profile.energy_before_sleep.date);
        }
        
        let nice_date = my_profile.energy_before_sleep.date.toLocaleDateString();
        alert("Loaded " + my_profile.get_event_count() + " measured ativities and " + 
            my_profile.days.length + " unprocessed days.<br>Last entry: " + nice_date, 'success');
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
    let backup_obj = {};
    backup_obj.profile = my_profile.to_json();
    backup_obj.settings = JSON.stringify(user_options);
    let backup_json = JSON.stringify(backup_obj);
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
                let backup = JSON.parse(reader.result);

                localStorage.setItem("events", backup.profile);
                localStorage.setItem("settings", backup.settings);
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
    if (!confirm("Are you absolutely, definitely sure that you want to start from scratch?")) {
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
            document.getElementById("resultAreaBlank").hidden = false;
            document.getElementById("resultArea").hidden = true;
            return;
        }
    }
    else {
        document.getElementById("resultAreaBlank").hidden = true;
        document.getElementById("resultArea").hidden = false;
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
            "<tr><td colspan='2'>Not enough data</td></tr>";

        // Sod it, just hide the whole thing.
        document.getElementById("rechargersDiv").classList.add("d-none");
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
            "<tr><td colspan='2'>Not enough data</td></tr>";

            // Sod it, just hide the whole thing.
            document.getElementById("energySinksDiv").classList.add("d-none");
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


    // Unfortunately, this "impact" section might be totally pointless.
    // // Top 3 impactful events
    // let top_three_impact_table = document.getElementById("impactTable").getElementsByTagName('tbody')[0];
    // top_three_impact_table.innerHTML = "";
    // if (top_three_impact.length === 0) {
    //     top_three_impact_table.innerHTML = 
    //         "<tr><td colspan='2'>Nothing happened. At all. Ever.</td></tr>";
    // }
    // else {
    //     for (let i = 0; i < top_three_impact.length; i++) {
    //         let row = top_three_impact_table.insertRow(-1);
    //         let name_cell = row.insertCell(0);
    //         let value_cell = row.insertCell(1);
    //         name_cell.innerHTML = top_three_impact[i].name;
    //         value_cell.innerHTML = Math.round(top_three_impact[i].impact_value()) + "%";
    //     }
    // }

    // Show the sleep quality
    if (average_sleep != 0) {
        document.getElementById("sleepQualityDiv").hidden = false;
        document.getElementById("rechargeRate").innerHTML = 
            my_profile.sleep.range_str() + "%";

        if (average_sleep < 0) {
            // Sleep quality so bad that it's actually a negative value.
            document.getElementById("sleepQuality").innerHTML = "Daily Draining Rate";
            
            // Set each sleepIcons to the draining icon
            let sleepIcons = document.getElementsByClassName("sleepIcon");
            for (let i = 0; i < sleepIcons.length; i++) {
                sleepIcons[i].src = "/img/battery_draining.png";
            }
            
        } else if (average_sleep > 0) {
            // Sleep quality in the positives, where it should be.
            document.getElementById("sleepQuality").innerHTML = "Daily Recharge Rate:";

            // Set each sleepIcons to the charging icon
            let sleepIcons = document.getElementsByClassName("sleepIcon");
            for (let i = 0; i < sleepIcons.length; i++) {
                sleepIcons[i].src = "/img/battery_charging.png";
            }
        }

    } else {
        document.getElementById("sleepQualityDiv").hidden = true;
    }

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
    remove_cell.classList.add("col-2");
    remove_cell.classList.add("col-md-1");

    // Name cell
    let div1 = document.createElement("div");
    div1.classList.add("input-group");

    let input = document.createElement("input");
    input.classList.add("eventNames");
    input.classList.add("form-control");
    input.setAttribute("type", "text");
    input.setAttribute("list", "previousEvents");
    input.setAttribute("placeholder", "Oh snap! Then what?");
    input.setAttribute("data-toggle", "tooltip");
    input.setAttribute("data-placement", "top");
    input.setAttribute("title", "Write down anything noteworthy to you. Re-use activities where possible for the best measurements.");
    input.addEventListener("change", estimate_activity_energy);
    div1.appendChild(input);

    let div2 = document.createElement("div");
    div2.classList.add("input-group-append");

    let select = document.createElement("select");
    select.classList.add("form-select");
    select.classList.add("input-group-select");
    select.classList.add("eventNumbers");
    select.setAttribute("type", "button");
    select.setAttribute("data-toggle", "tooltip");
    select.setAttribute("data-placement", "top");
    select.setAttribute("title", "How many times did you do this? Cost/recharge is for each time.");

    let option1 = document.createElement("option");
    option1.setAttribute("value", "1");
    option1.setAttribute("selected", "selected");
    option1.innerHTML = "Once";
    select.appendChild(option1);

    let option2 = document.createElement("option");
    option2.setAttribute("value", "2");
    option2.innerHTML = "Twice";
    select.appendChild(option2);

    let option3 = document.createElement("option");
    option3.setAttribute("value", "3");
    option3.innerHTML = "Thrice";
    select.appendChild(option3);

    let option4 = document.createElement("option");
    option4.setAttribute("value", "5");
    option4.innerHTML = "A lot!";
    select.addEventListener("change", estimate_activity_energy);
    select.appendChild(option4);

    div2.appendChild(select);
    div1.appendChild(div2);
    name_cell.appendChild(div1);

    // name_cell.innerHTML = 
    //     "<div class='input-group'>" +
    //     "   <input type='text' class='eventNames form-control' list='previousEvents' placeholder='Oh snap! Then what?'>" +
    //     "   <div class='input-group-append'>" +
    //     "       <select class='form-select input-group-select eventNumbers' type='button'>" +
    //     "           <option value='1' selected>Once</option>" +
    //     "           <option value='2'>Twice</option>" +
    //     "           <option value='3'>Thrice</option>" +
    //     "           <option value='5'>A lot!</option>" +
    //     "       </select>" +
    //     "   </div>" +
    //     "</div>";

    // Value cell
    input = document.createElement("input");
    input.classList.add("eventValues");
    input.classList.add("form-control");
    input.setAttribute("type", "number");
    input.setAttribute("placeholder", "?");
    input.setAttribute("min", "-100");
    input.setAttribute("max", "100");
    input.addEventListener("change", function() {
        input.value = clamp(input.value, -100, 100);        
        estimate_activity_energy();        
    });
    input.setAttribute("data-toggle", "tooltip");
    input.setAttribute("data-placement", "top");
    input.setAttribute("title", "Negative numbers are costs, positive numbers recharge. If you dont know, leave it blank and I'll calculate it for you.");
    value_cell.appendChild(input);

    // value_cell.innerHTML = "<input type='number' class='eventValues form-control' " + 
    //     "placeholder='auto'  min='-100' max='100'>";

    // Remove cell
    let button = document.createElement("button");
    button.classList.add("removeEventBtn");
    button.classList.add("btn-danger");
    button.classList.add("form-control");
    button.addEventListener("click", function() { 
        remove_event_row(row);
        estimate_activity_energy();
    });
    button.innerHTML = "-";
    remove_cell.appendChild(button);

    // remove_cell.innerHTML = "<button class='removeEventBtn btn-danger form-control' " + 
    //     "onclick=\"remove_event_row(this);\">-</button>";

    $('[data-toggle="tooltip"]').tooltip();
}

// Small addition for removing a row from the table.
function remove_event_row(row) {
    row.parentNode.removeChild(row);
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
                todays_events.push(new Activity(event_names[i].value, "auto"));
            }
            else {
                todays_events.push(new Activity(event_names[i].value, event_values[i].value));
            }
        }
    }

    // Sleep
    morning_energy_level = document.getElementById("batteryLevelStart").value;
    current_energy_level = document.getElementById("batteryLevelEnd").value;

    return todays_events;
}

function set_ui_on_load() {

    let estimated_starting_energy = 50;
    DEFAULT_ENERGY_LEVEL = 50;
    
    // What was yesterday's energy level?
    if (my_profile.energy_before_sleep !== null 
        && my_profile.energy_before_sleep !== undefined
        && my_profile.energy_before_sleep.value !== null
        ) {

        let nice_date = my_profile.energy_before_sleep.date.toLocaleDateString();
        // document.getElementById("yesterdaysEnergyMention").innerHTML = 
        //     "Last energy level logged was on " + nice_date 
        //     + " at " + my_profile.energy_before_sleep.value + "%.";

        // Estimate today's energy level based on yesterday's end and our sleep quality
        estimated_starting_energy = parseFloat(my_profile.energy_before_sleep.value)
            + parseFloat(my_profile.sleep.estimate_value());
        estimated_starting_energy = clamp(estimated_starting_energy, 0, 100);
        DEFAULT_ENERGY_LEVEL = parseInt(estimated_starting_energy);

        // debug
        console.log("Last energy level logged was on " + nice_date 
            + " at " + my_profile.energy_before_sleep.value + "%.");
            console.log("Average daily recharge: " + my_profile.sleep.estimate_value() + "%" );
        console.log("Estimated starting energy: " + estimated_starting_energy);

    }
    else {
        document.getElementById("yesterdaysEnergyMention").innerHTML = "";
    }

    // Starting energy
    document.getElementById("batteryLevelStart").value = DEFAULT_ENERGY_LEVEL;
    document.getElementById("batteryIconStart").src = 
        get_battery_gauge_picture(DEFAULT_ENERGY_LEVEL, 1);
    document.getElementById("batteryLevelStart").setAttribute(
        "data-value", parseInt(DEFAULT_ENERGY_LEVEL) + "%");
    let words = get_battery_gauge_descriptor(DEFAULT_ENERGY_LEVEL);
    document.getElementById("batteryLevelStartDescriptor").innerHTML = words.descriptor;
    document.getElementById("batteryLevelStartComment").innerHTML = words.comment;

    // Ending energy (set to start - sleep in an attempt to encourage balanced days)
    let ending_energy = DEFAULT_ENERGY_LEVEL - my_profile.sleep.estimate_value();
    document.getElementById("batteryLevelEnd").value = ending_energy;
    document.getElementById("batteryIconEnd").src = 
        get_battery_gauge_picture(ending_energy, 1);
    document.getElementById("batteryLevelEnd").setAttribute(
        "data-value", parseInt(ending_energy) + "%");
    words = get_battery_gauge_descriptor(ending_energy);
    document.getElementById("batteryLevelEndDescriptor").innerHTML = words.descriptor;
    document.getElementById("batteryLevelEndComment").innerHTML = words.comment;

    // Options
    document.getElementById("askQuestions").checked = user_options.ask_questions;
    document.getElementById("showRunningTotal").checked = user_options.show_running_total;

    // There are a few things that change when the battery level changes, so we'll
    // trigger a change event on the battery level to make sure they get updated
    let battery_level_start = document.getElementById("batteryLevelStart");
    battery_level_start.dispatchEvent(new Event("change"));
    let batter_level_end = document.getElementById("batteryLevelEnd");
    batter_level_end.dispatchEvent(new Event("change"));

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

    // Alter the save button depending on whether or not this is a new user
    if (my_profile.get_event_count() == 0 && my_profile.days.length == 0) {
        let save_div = document.getElementById("SaveEventsDivSimple");
        save_div.classList.add("d-flex");
        save_div.classList.remove("d-none");
    }
    else {
        let save_div = document.getElementById("SaveEventsDivAdvanced");
        save_div.classList.add("d-flex");
        save_div.classList.remove("d-none");
    }


}

function enable_advanced_options() {
    
    let advanced_options = document.getElementsByClassName("advanced-option");

    if (document.getElementById("advancedOptions").checked) {
        // Show all items that have the class "advanced-option"
        for (let i = 0; i < advanced_options.length; i++) {
            advanced_options[i].classList.add("d-flex");
            advanced_options[i].classList.remove("d-none");
        }
    }
    else {
        // Hide all items that have the class "advanced-option"
        for (let i = 0; i < advanced_options.length; i++) {
            advanced_options[i].classList.add("d-none");
            advanced_options[i].classList.remove("d-flex");
        }
    }

    save_settings();
}

function estimate_activity_energy() {

    // The user did want this, right?
    if (user_options.show_running_total !== true) {
        document.getElementById("activityEstimateRow").classList.remove("d-flex");
        document.getElementById("activityEstimateRow").classList.add("d-none");
        return;
    }

    // Run through each activity...
    let total_energy = 0;
    let have_something = false;
    let eventNames = document.getElementsByClassName("eventNames");
    let eventNumbers = document.getElementsByClassName("eventNumbers");
    let eventValues = document.getElementsByClassName("eventValues");
    for (let i = 0; i < eventNames.length; i++) {

        if (eventNames[i].value === "") {
            continue;
        }

        // Any entered value takes priority
        if (eventValues[i].value !== "") {
            total_energy += parseInt(eventValues[i].value) * parseInt(eventNumbers[i].value);
            have_something = true;
        }
        else {
            // Do we know the value of this one?
            let activity = eventNames[i].value;
            let evnt = my_profile.get_event(activity);
            if (evnt !== null) {
                total_energy += parseInt(evnt.estimate_value()) * parseInt(eventNumbers[i].value);
                have_something = true;
            }  
        }
    }

    // Update the UI
    if (have_something) {

        // If we have something, there are some other calculations we can do for the user
        let starting_energy = parseInt(document.getElementById("batteryLevelStart").value);
        let estimated_ending_energy = starting_energy - total_energy;
        let estimated_next_morning_energy = 
            parseInt(estimated_ending_energy + my_profile.sleep.estimate_value());
        let next_morning_comment = "";
        
        if (estimated_next_morning_energy < starting_energy) {
            next_morning_comment = "You're in an energy deficit. Get an extra hour of sleep!";
        }
        else if (estimated_next_morning_energy > starting_energy) {
            next_morning_comment = "You're in an energy surplus. Excellent!";   
        }
        else {
            next_morning_comment = "Your daily energy output is perfectly balanced, as all things should be.";
        }

        // Show the estimate row
        document.getElementById("activityEstimateRow").classList.remove("d-none");
        document.getElementById("activityEstimateRow").classList.add("d-flex");

        document.getElementById("activityEnergyTotal").innerHTML = 
            total_energy + "%";
        document.getElementById("endOfDayPrediction").innerHTML = 
            estimated_ending_energy + "%";
        document.getElementById("nextDayStartPrediction").innerHTML =  
            estimated_next_morning_energy + "%";
        document.getElementById("nextDayStartPredictionComment").innerHTML = 
            next_morning_comment;
            
    }
    else {
        // Hide the estimate row
        document.getElementById("activityEstimateRow").classList.remove("d-flex");
        document.getElementById("activityEstimateRow").classList.add("d-none");        
    }
}

// ----- Options -----

// Raise/Lower the flag for asking questions
function to_ask_or_not_to_ask() {
    if (document.getElementById("askQuestions").checked) {
        user_options.ask_questions = true;
        console.log("Asking questions");
    }
    else {
        user_options.ask_questions = false;
        console.log("Not asking questions");       
    }

    save_settings();
}

// Raise/Lower the flag for showing a running total
function should_we_show_running_total() {
    if (document.getElementById("showRunningTotal").checked) {
        user_options.show_running_total = true;
        console.log("Showing a running total");
    }
    else {
        user_options.show_running_total = false;
        console.log("Not showing a running total");
    }

    estimate_activity_energy();
    save_settings();
}

// ----- Event Listeners -----

//document.getElementById("loadEventsBtn").addEventListener("click", load_events);
document.getElementById("saveEventsBtn").addEventListener("click", save_events);
document.getElementById("saveEventsBtnAdvanced").addEventListener("click", save_events);
document.getElementById("addEventBtn").addEventListener("click", add_event_row);
document.getElementById("clearEventsBtn").addEventListener("click", clear_all_events);
document.getElementById("calculateBtn").addEventListener("click", show_energy_results, true);
document.getElementById("createBackupBtn").addEventListener("click", create_backup);
document.getElementById("restoreBackupBtn").addEventListener("click", restore_backup);
document.getElementById("askQuestions").addEventListener("change", to_ask_or_not_to_ask);
document.getElementById("showRunningTotal").addEventListener("change", should_we_show_running_total);
// document.getElementById("advancedOptions").addEventListener("change", enable_advanced_options);

document.getElementById("batteryLevelStart").addEventListener("change", estimate_activity_energy);
let vals = document.getElementsByClassName("eventValues");
for (let i = 0; i < vals.length; i++) {
    vals[i].addEventListener("change", function() {
        vals[i].value = clamp(vals[i].value, -100, 100);        
        estimate_activity_energy();
    });
}
let nums = document.getElementsByClassName("eventNumbers");
for (let i = 0; i < nums.length; i++) {
    nums[i].addEventListener("change", estimate_activity_energy);
}
let names = document.getElementsByClassName("eventNames");
for (let i = 0; i < names.length; i++) {
    names[i].addEventListener("change", estimate_activity_energy);
}

// We want to do a quick save whenever the user leaves the page
// window.addEventListener("beforeunload", function (e) {
//     save_events();
// });
