// update header
if (localStorage.getItem('session') != null) {
  $(logged_in).show();
  if (window.location.pathname.startsWith("/register")) {
    window.location.href = "/profile";
  }
} else {
  $(logged_out).show();
  if (window.location.pathname.startsWith("/profile")) {
    window.location.href = "/login";
  }
}

// Page specific handling
$(document).ready(() => {
  $(logout_link).click(e => {
    e.preventDefault();
    logout();
  });
  var path = window.location.pathname;
  switch (path) {
    case '/challenges':
      load_challenges();
      break;
    case '/challenge':
      load_challenge();
      $(validate_flag_form).submit(e => {
        e.preventDefault();
        handle_validate_flag();
      });
      break;
    case '/scoreboard':
      load_scoreboard();
      break;
    case '/login':
      $(login_form).submit(e => {
        e.preventDefault();
        handle_login();
      });
      break;
    case '/password_reset':
      $(password_reset_form).submit(e => {
        e.preventDefault();
        handle_password_reset();
      });
      break;
    case '/reset':
      $(reset_form).submit(e => {
        e.preventDefault();
        handle_reset();
      });
      break;
    case '/register':
      $(register_form).submit(e => {
        e.preventDefault();
        handle_register();
      });
      break;
    case '/profile':
      $(update_profile_form).submit(e => {
        e.preventDefault();
        handle_update_profile();
      });
      $(create_team_form).submit(e => {
        e.preventDefault();
        handle_create_team();
      });
      $(join_team_form).submit(e => {
        e.preventDefault();
        handle_join_team();
      });
      $(leave_team_form).submit(e => {
        e.preventDefault();
        handle_leave_team();
      });
      load_profile();
      break;
    case '/verify':
      handle_verify();
      break;
    case '/':
    case '/home':
      $(start).text(format_timestamp(eventStart.content));
      $(end).text(format_timestamp(eventEnd.content));
      break;
  }
});

// update any element with class "countdown"
// e.g. <span class="countdown" data-time="n in seconds">
var page_load_time = Date.now();
function update_countdown() {
  var elapsed = ((Date.now() - page_load_time)/1000)|0;
  $('.countdown').map((_, element) => {
    var seconds = $(element).attr('data-time') - elapsed;
    if (seconds <= 0) {
      $(element).text('')
      return;
    }
    var days = (seconds / 86400)|0;
    var hours = ((seconds % 86400) / 3600)|0;
    var minutes = ((seconds % 3600) / 60)|0;
    var seconds = seconds % 60;

    var text = "";
    if (days > 0) {
      text = days + ' day' + (days > 1 ? 's' : '') +
          ', ' + hours + ' hour' + (hours > 1 ? 's' : '');
    } else if (hours > 0) {
      text = hours + ' hour' + (hours > 1 ? 's' : '') +
          ', ' + minutes + ' minute' + (minutes > 1 ? 's' : '');
    } else if (minutes > 0) {
      text = minutes + ' minute' + (minutes > 1 ? 's' : '') +
          ', ' + seconds + ' second' + (seconds > 1 ? 's' : '');
    } else {
      text = seconds + ' second' + (seconds > 1 ? 's' : '');
    }
    $(element).text("(" + text + ")");
  })
}
setInterval(update_countdown, 1000);

function logout() {
  localStorage.clear('session');
  window.location.href = '/';
}

function do_get(url, el, cb) {
  $(el).empty();
  var spinner = $('<span>').addClass('spinner');
  $(el).append(spinner);

  $.ajax({
    type: "GET",
    url: url,
    dataType: "json",
    headers: {
      "X-U": localStorage.getItem('session')
    }
  })
    .always(() => spinner.remove())
    .fail((jqXHR) => {
      if (jqXHR.status == 400) {
          logout();
          window.location.href = "/login";
          return;
      }
      // TODO: this error handling needs improving
      var error = jqXHR.responseText || "timeout";
      if (error.length > 255) {
        error = jqXHR.status + ": " + jqXHR.statusText;
      }
      $(el).append($('<span>').addClass('error').text(error));
    })
    .done((data, _, xhr) => {
      cb(data, xhr)
    });
}

function do_post(url, el, cb, skip_ok) {
  // remove previously added elements
  var submit = $(el).find("input[type=submit]");
  submit.siblings().remove();

  // create spinner
  var spinner = $('<span>').addClass('spinner');
  submit.after(spinner);

  var data_arr = $(el).serializeArray();
  var data = {};
  data_arr.map(v => data[v.name] = v.value);
  headers = {};
  $.ajax({
    type: "POST",
    url: url,
    data: JSON.stringify(data),
    dataType: "json",
    headers: {
      "X-S": 1,
      "X-U": localStorage.getItem('session')
    }
  })
    .always(() => spinner.remove())
    .fail((jqXHR) => {
      if (jqXHR.status == 401) {
        // 401 implies the session is incorrect. Let's logout
        logout();
        return;
      }
      var error = jqXHR.responseText || "timeout";
      if (error.length > 255) {
        // TODO: this error handling needs improving
        error = jqXHR.status + ": " + jqXHR.statusText;
      }
      submit.after($('<span>').addClass('error').text(error));
    })
    .done((data) => {
      if (skip_ok) {
        cb(data);
      } else {
        var ok = $('<span>').addClass('success').text("✓");
        submit.after(ok);
        setTimeout(() => {
          ok.remove();
          cb(data);
        }, 1000);
      }
    });
}

function handle_update_profile() {
  do_post("/api/user/update", update_profile_form, () => {
    window.location.href = "/profile";
  });
}

function handle_join_team(e) {
  do_post("/api/team/join", join_team_form, (data) => {
    window.location.href = "/profile";
  });
}

function handle_leave_team() {
  do_post("/api/team/leave", leave_team_form, (data) => {
    window.location.href = "/profile";
  });
}

function handle_create_team() {
  do_post("/api/team/create", create_team_form, () => {
    window.location.href = "/profile";
  });
}

function load_challenges() {
  do_get("/api/challenges", challenges_load, (data, xhr) => {
    var now = (new Date().getTime() / 1000)|0;
    var numbers = ["one<!-- I -->", "two<!-- II -->", "three<!-- III -->", "four<!-- IV -->", "five<!-- V -->", "six<!-- VI -->",
      "seven<!-- VII -->", "eight<!-- VIII -->", "nine<!-- IX -->", "ten<!-- X -->", "eleven<!-- XI -->"];
    var countdown_shown = false;
    data.challenges.sort((a, b) => {
      if (a.topics[0] < b.topics[0]) {
        return -1;
      } else if (a.topics[0] > b.topics[0]) {
        return 1;
      }
      if (a.points < b.points) {
        return -1;
      } else if (a.points > b.points) {
        return 1;
      }
      return a.name < b.name;
    });

    for (var i=0; i<data.challenges.length; i++) {
      var is_last = (i == data.challenges.length - 1);
      var challenge = data.challenges[i];

      var e = $('<span>')
      var title = "       ";
      title += is_last ? "└" : "├";
      title += "──┬── ";
      if (challenge.chid == "") {
        title += format_timestamp(challenge.release);
        e.html(title);
        if (!countdown_shown) {
          e.append($("<span>").addClass("countdown").attr("data-time", challenge.release - now));
          countdown_shown = true;
        }
      } else {
        e.html(title);
        e.append($("<a>").attr('href', '/challenge?' + challenge.chid).text(challenge.name));
      }
      $(tree).append($('<div>').append(e));

      if (challenge.topics.length > 0) {
        var t = is_last ? "          " : "       │  ";
        title = t + "├── " + challenge.topics.join(" ˖ ");
        $(tree).append($('<div>').text(t + "│"));
        $(tree).append($('<div>').text(title));
      }

      var t = is_last ? "          " : "       │  ";
      title = t + "└── points: " + challenge.points;
      $(tree).append($('<div>').text(t + "│"));
      $(tree).append($('<div>').text(title));

      t = is_last ? "          " : "       │  ";
      $(tree).append($('<div>').text(t));
      $(tree).append($('<div>').text(t));
      $(tree).append($('<div>').text(t));
    }
    $(tree).show();
    update_countdown();
  });
}

function load_challenge() {
  do_get("/api/challenges", challenges_load, (data, xhr) => {
    var c = document.location.search.substr(1) || "404"
    for (var i=0; i<data.challenges.length; i++) {
      var challenge = data.challenges[i];
      if (challenge.chid == decodeURI(c)) {
        $(challenge_name).text(challenge.name);
        $(points).text(challenge.points);
        $(topics).text(challenge.topics.join(" + "));
        $(description).html(challenge.description);
        $(challenge_info).show();
        load_challenge_scoreboard(challenge.name);
      }
    }
  });
}

function load_challenge_scoreboard(filter) {
  _load_challenge_scoreboard(filter);
  // refresh every minute
  setTimeout(() => {
    $(solves_load).hide();
    load_challenge_scoreboard(filter);
  }, 60000);
}

function _load_challenge_scoreboard(filter) {
  do_get("/api/solves", solves_load, (data, xhr) => {
    $(teams).empty();
    // Filter data.standings for teams which have solved the current challenge
    // and sort by time.
    var taskStats = [];
    for (var i=0; i<data.standings.length; i++) {
      var standing = data.standings[i];
      if (standing.taskStats[filter]) {
        taskStats.push({team: standing.team, time: standing.taskStats[filter].time});
      }
    }
    taskStats.sort((a, b) => (a.time == b.time) ? 0 : ((a.time < b.time) ? -1 : 1));

    // Table
    if (taskStats.length == 0) {
      $(solves_load).text("∅");
      $(solves_load).show();
    } else {
      for (var i=0; i<taskStats.length; i++) {
        var row = $('<tr>');
        row.append($('<td>').addClass('noglitchr').text(taskStats[i].team));
        row.append($('<td>').append(format_timestamp(taskStats[i].time)));
        $(teams).append(row);
      }
      $(solves_table).show();
    }
  });
}

function load_scoreboard() {
  _load_scoreboard();
  // refresh every minute
  setTimeout(() => {
    $(scoreboard_load).hide();
    load_scoreboard();
  }, 60000);
}

function _load_scoreboard() {
  do_get("/api/solves", scoreboard_load, (data, xhr) => {
    $(plot).empty();
    $(teams).empty();
    var now = new Date().getTime();
    if (now > (eventEnd.content * 1000)) {
      now = eventEnd.content * 1000
    }
    // Note: Override data with sample_scoreboard.json for scoreboard testing

    // Auto update leaderboard every minute
    if (data.standings.length == 0) {
      $(scoreboard_load).text("∅");
      return;
    }

    // Convert data.standings to a format which shows accumulated score. We call these traces
    var traces = [];
    for (var i=0; i<data.standings.length; i++) {
      if (i == 10) {
        // we only want to draw the top 10 teams
        break;
      }
      var standing = data.standings[i];
      var taskStats = [];
      for (k in standing.taskStats) {
        taskStats.push(standing.taskStats[k])
      };
      taskStats.sort((a, b) => (a.time == b.time) ? 0 : ((a.time < b.time) ? -1 : 1));
      var points = [];
      points.push({x: eventStart.content * 1000, y: 0}); // everyone stats with 0

      var total = 0;
      for (j=0; j<taskStats.length; j++) {
        total += taskStats[j].points
        points.push({x: taskStats[j].time * 1000, y: total});
      }
      var trace = {
        label: standing.team,
        data: points
      };
      traces.push(trace);
    }

    var max = traces[0].data[traces[0].data.length - 1].y;
    var margin = {top: 50, right: 150, bottom: 50, left: 40};
    var outerWidth = 800;
    var outerHeight = 500;
    var width = outerWidth - margin.left - margin.right;
    var height = outerHeight - margin.top - margin.bottom;

    var svg = d3.select("#plot")
      .append("svg")
      .attr("width", outerWidth)
      .attr("height", outerHeight);

    var x = d3.scaleTime().domain([eventStart.content*1000, now]).range([0, width]);
    var y = d3.scaleLinear().domain([0, max]).range([height, 0]);

    // If two teams have the same score, give the better ranked team a small bonus to avoid overlapping laps
    var min_space = 8;
    var bonus = y.invert(0) - y.invert(min_space)
    // Only account to maximum 3 teams with the same score (2 extra_sep away)
    var bonus_space_threshold = bonus * 2;
    for (var i=0; i<traces.length; i++) {
      var trace = traces[i];
      var l = trace.data.length;
      var extra_sep = 0;
      for (var j=i+1; j<traces.length; j++) {
        m = traces[j].data.length;
        if (y(traces[j].data[m-1].y) - y(trace.data[l-1].y) < min_space * (j-i)) {
          extra_sep++;
        } else {
          break;
        }
      }
      var t = bonus * extra_sep;

      if (t > bonus_space_threshold) { t = bonus_space_threshold; }
      var new_y = trace.data[l-1].y + t;
      trace.data.push({x: now, y: trace.data[l-1].y});
      trace.labelY = new_y;
    }

    // Draw the axis
    if (now - eventStart.content*1000 > 86400000) {
      // one tick per day
      svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + (height + margin.top) + ")")
        .call(
          d3.axisBottom(x)
            .ticks(d3.timeDay.every(1))
            .tickFormat(d => d.toLocaleDateString(undefined, {month: "short", day: "2-digit"})))
    } else {
      // one tick per hour
      svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + (height + margin.top) + ")")
        .call(
          d3.axisBottom(x)
            .ticks(d3.timeHour.every(1))
            .tickFormat(d => d.toLocaleDateString(undefined, {})))
    }
    svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      .call(d3.axisLeft(y))

    var line = d3.line()
      .x(d => x(d.x) + margin.left)
      .y(d => y(d.y) + margin.top)

    // Draw lines in reverse order
    for (var i=traces.length-1; i>=0; i--) {
      var trace = traces[i];
      svg.append("path")
        .attr("d", line(trace.data))
        .attr("class", "shadow")
      svg.append("path")
        .attr("d", line(trace.data))
        .attr("class", "color"+i)
      svg.append("svg")
        .attr("x", (x(now) + margin.left + 5))
        .attr("y", (y(trace.labelY)+margin.top-5))
        .attr("height", "10")
        .attr("width", trace.right)
        .append("text")
          .attr("transform", "translate(0, 5)")
          .attr("dy", "0.25em")
        	.attr("text-anchor", "start")
        	.attr("class", "fill"+i)
        	.text(trace.label)
    }

    // Draw circles in reverse order
    for (var i=traces.length-1; i>=0; i--) {
      var trace = traces[i];
      svg.selectAll(".fill"+i)
        .data(trace.data.slice(0, trace.data.length-1))
        .enter()
        .append("circle")
          .attr("class", "fill"+i)
          .attr('cx', (d, i) => {
            return x(d.x) + margin.left;
          })
          .attr('cy', (d, i) => {
            return y(d.y) + margin.top;
          })
          .attr('r', 3);
    }

    // Table
    for (var i=0; i<data.standings.length; i++) {
      var standing = data.standings[i];
      var row = $('<tr>');
      row.append($('<td>').text(standing.pos));
      row.append($('<td>').addClass('noglitchr').text(standing.team));
      row.append($('<td>').text(standing.score));
      row.append($('<td>').append(format_timestamp(standing.lastAccept)));
      $(teams).append(row);
    }
    $(teams_table).show();
  });
}

function send_email_verification() {
    do_post("/api/user/sendVerify", verified_send_form,
        data => {}
    );
    $(verified_send_button).text("Verification sent!");
    $(verified_send_button).prop('disabled', true);
    $(verified_send_button).prop('onclick', null);

}

function load_profile() {
  do_post("/api/user/profile", profile_load_form, data => {
    $(update_profile_username).val(data.username);
    $(update_profile_email).val(data.email ? data.email : "n/a");
    $(profile).show();

    if (data.teamToken) {
      $(display_team).text(data.team);
      $(members).text(data.members.sort().join(", "));
      $(teamToken).text(data.teamToken);
      $(has_team).show();
    } else {
      $(no_team).show();
    }

    if (data.verified) {
        $(verified_send_button).text("Verified");
        $(verified_send_button).prop('disabled', true);
    } else {
        $(verified_send_button).text("Re-send email verification");
        $(verified_send_button).prop('disabled', false);
        $(verified_send_button).on("click", send_email_verification);
    }

    if (data.solves.length == 0) {
      $(no_score).show();
    } else {
      // Sort the solves by timestamp
      data.solves.sort((a, b) => (a.timestamp == b.timestamp) ? 0 : ((a.timestamp < b.timestamp) ? -1 : 1));
      data.solves.map(s => {
        var row = $('<tr>')
        row.append($('<td>').text(s.challenge))
        row.append($('<td>').text(s.bonus ? s.points + s.bonus + ' (bonus)' : s.points))
        if (s.username) {
          row.append($('<td>').addClass('noglitchr').text(s.username));
        } else {
          row.append($('<td>').append($('<i>').text("ex-member")));
        }
        row.append($('<td>').text(s.advice));
        row.append($('<td>').text(format_timestamp(s.timestamp)));
        $(score_table).append(row)
      });
      $(has_score).show();
    }
    $(score).show();
  }, true);
}

function handle_verify() {
  $(code).val(document.location.hash.substr(1));
  do_post("/api/user/verify", verify_form, (data) => {
    // redirect
    window.location.href = "/"
  });
}

function handle_reset() {
  // check that password and password2 match
  if (password.value != password2.value) {
    var submit = $(reset_form).find("input[type=submit]");
    submit.siblings().remove();
    submit.after($('<span>').addClass('error').text("password and confirm password do not match."));
    return;
  }
  $(code).val(document.location.hash.substr(1));
  do_post("/api/user/verifyResetEmail", reset_form, (data) => {
    // save session
    localStorage.setItem('session', data.session);

    // redirect
    window.location.href = "/profile"
  });
}

function handle_register() {
  // check that password and password2 match
  if (password.value != password2.value) {
    var submit = $(register_form).find("input[type=submit]");
    submit.siblings().remove();
    submit.after($('<span>').addClass('error').text("password and confirm password do not match."));
    return;
  }
  do_post("/api/user/register", register_form, (data) => {
    // save session
    localStorage.setItem('session', data.session);

    // redirect
    window.location.href = "/profile"
  });
}

function handle_login() {
  do_post("/api/user/login", login_form, data => {
    // save session
    localStorage.setItem('session', data.session);

    // redirect
    window.location.href = "/profile";
  });
}

function handle_password_reset() {
  do_post("/api/user/sendResetEmail", password_reset_form, data => {
    var submit = $(password_reset_form).find("input[type=submit]");
    submit.siblings().remove();
    submit.after($('<span>').addClass('info').text("Look for an email from no-reply@squarectf.com"));
  });
}

function handle_validate_flag() {
  var flag = $(flag_input).val()
  if (/flap-/i.test(flag)) {
    window.location.href = "/static/img/flap.gif";
    return;
  } else if (!/flag\{.*\}/i.test(flag)) {
    var submit = $(validate_flag_form).find("input[type=submit]");
    submit.siblings().remove();
    submit.after($('<span>').addClass('error').text("flag does not meet expected format."));
    return;
  }

  do_post("/api/flag", validate_flag_form, data => {
    // redirect
    window.location.href = "/profile";
  })
}

function format_timestamp(timestamp) {
  var date = new Date(timestamp*1000);
  var r = date.toLocaleDateString(undefined, {dateStyle: "medium"}) + " @ ";
  return r + date.toLocaleTimeString(undefined, {timeStyle: "long"}) + " ";
}
