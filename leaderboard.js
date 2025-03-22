var leaderboard = (function() {
    // For recaptcha.
    const site_key = "6Le6rvwqAAAAAIhHsQfZPb6pkU9nUnnkqD5mqADl";

    let lastScore = {
        set: false,
        score: 0,
        scoreid: "",
        date: 0,
        submitted: false,
        hidden: false // Only not hidden between restarts.
    };

    let highScore = {
        set: false,
        score: 0,
        scoreid: "",
        date: 0,
        submitted: false
    };

    function applyScores() {
        // Update UI.
        if (lastScore.submitted || lastScore.score == 0) {
            submit_last_score_el.classList.add("hidden");
        } else if (!lastScore.hidden) {
            submit_last_score_el.classList.remove("hidden");
        }

        if (highScore.submitted || highScore.score == 0) {
            submit_high_score_el.classList.add("hidden");
        } else {
            submit_high_score_el.classList.remove("hidden");
        }

        submit_last_score_el.innerHTML = "Submit score (" + lastScore.score + ") to leaderboard";
        document.querySelector("#high_score").innerHTML = "Local best: " + highScore.score;

        // Update local storage.
        if (highScore.set && highScore.score != 0) {
            localStorage.setItem("highScore", JSON.stringify(highScore));
        }
    }

    const submit_last_score_el = document.querySelector("#submit_last_score");
    submit_last_score_el.addEventListener("click", function (e) {
        submitScore(lastScore, function () {
            lastScore.submitted = true;
            if (lastScore.scoreid == highScore.scoreid) {
                highScore.submitted = true;
            }
            applyScores();
        });
        e.preventDefault();
    });

    const submit_high_score_el = document.querySelector("#submit_high_score");
    submit_high_score_el.addEventListener("click", function (e) {
        submitScore(highScore, function () {
            highScore.submitted = true;
            applyScores();
        });
        e.preventDefault();
    });

    function loadScore() {
        const highScore_json = localStorage.getItem("highScore");
        if (!highScore_json) {
            return;
        }
        highScore = JSON.parse(highScore_json);
        applyScores();
    }
    loadScore();

    function getUUID() {
        if (window.isSecureContext) {
            return crypto.randomUUID();
        } else {
            return "" + Math.floor(Math.random() * 10000000);
        }
    }


    function setScore(score) {
        if (score == 0) {
            return;
        }

        lastScore.set = true;
        lastScore.score = score;
        lastScore.scoreid = getUUID();
        lastScore.date = Date.now();
        lastScore.submitted = false;

        if (!highScore.set || score > highScore.score) {
            highScore.set = lastScore.set;
            highScore.score = lastScore.score;
            highScore.scoreid = lastScore.scoreid;
            highScore.date = lastScore.date;
            highScore.submitted = lastScore.submitted;
        }

        applyScores();
    }

    function submitScore(scoreObj, on_success) {
        const name = prompt("Enter name");
        if (name == null) {
            return;
        }
        if (name.trim() == "") {
            return;
        }

        grecaptcha.ready(function () {
            grecaptcha.execute(site_key, { action: 'submit' }).then(function (token) {
                const fd = new FormData();
                fd.append("token", token);
                fd.append("name", name);
                fd.append("score", "" + scoreObj.score);
                fd.append("scoreid", scoreObj.scoreid);
                fd.append("date", "" + scoreObj.date);
                return fetch("leaderboard/submit.php", {
                    method: "POST",
                    body: fd
                });
            }).then(function (res) {
                return res.json()
            }).then(function (res) {
                if (!res["ok"]) {
                    alert("Error submitting score: " + res["msg"]);
                } else {
                    alert("Score saved");
                    if (on_success) {
                        on_success();
                    }
                }
            }).catch(function (res) {
                console.log("Unexpected error submitting score", res);
                alert("Unexpected error submitting score. See Developer Tools for more information.");
            });
        });
    }

    return {
        setScore: setScore
    }
})();