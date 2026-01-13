// Angle representing the radius of one snake node.
var NODE_ANGLE = Math.PI / 70;

// This is the number of positions stored in the node queue.
// This determines the velocity.
var NODE_QUEUE_SIZE = 9;

var STARTING_DIRECTION = Math.random();
var PAUSED = false;

var cnv, ctx, width, height, centerX, centerY, points, stopped;

var clock; // Absolute time since last update.
var accumulatedDelta = 0; // How much delta time is built up.

// An array of snake nodes.
var snake;

// Point representing the pellet to eat.
var pellet;

var snakeVelocity;

// The straight distance required to have two nodes colliding.
// To derive, draw a triangle from the sphere origin of angle 2 * NODE_ANGLE.
var collisionDistance = 2 * Math.sin(NODE_ANGLE);

// The angle of the current snake direction in radians.
var direction = STARTING_DIRECTION;

var focalLength = 500;

var leftDown, rightDown;

var score = 0;

const btnMoveLeft = document.querySelector("#move_left");
function setLeft(val) {
    if (val) {
        leftDown = true;
        btnMoveLeft.classList.add("down");
    } else {
        leftDown = false;
        btnMoveLeft.classList.remove("down");   
    }
}

const btnMoveRight = document.querySelector("#move_right");
function setRight(val) {
    if (val) {
        rightDown = true;
        btnMoveRight.classList.add("down");
    } else {
        rightDown = false;
        btnMoveRight.classList.remove("down");   
    }
}

function togglePause() {
    if (PAUSED) {
        PAUSED = false;
        delBanners();
        window.requestAnimationFrame(update);
    } else {
        PAUSED = true;
        document.getElementById('paused').style = 'display:block';
    }
}

window.addEventListener('keydown', function(e) {
    if (e.key == "ArrowLeft"  || e.code == "KeyA") setLeft(true);
    if (e.key == "ArrowRight" || e.code == "KeyD") setRight(true);

    if (e.code == "Space") togglePause();
});

window.addEventListener('keyup', function(e) {
    if (e.key == "ArrowLeft"  || e.code == "KeyA") setLeft(false);
    if (e.key == "ArrowRight" || e.code == "KeyD") setRight(false);
    if (e.code == "KeyT") document.getElementById("fixDir").click();
});

btnMoveLeft.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    setLeft(true);
});
btnMoveLeft.addEventListener("pointerleave", function (e) {
    e.preventDefault();
    setLeft(false);
});
btnMoveLeft.addEventListener("pointerup", function (e) {
    e.preventDefault();
    setLeft(false);
});
btnMoveLeft.addEventListener("contextmenu", function (e) {
    e.preventDefault();
});

btnMoveRight.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    setRight(true);
});
btnMoveRight.addEventListener("pointerleave", function (e) {
    e.preventDefault();
    setRight(false);
});
btnMoveRight.addEventListener("pointerup", function (e) {
    e.preventDefault();
    setRight(false);
});
btnMoveRight.addEventListener("contextmenu", function (e) {
    e.preventDefault();
});

document.querySelector("#refresh").addEventListener("click", (e) => {
    e.preventDefault();
    window.location.reload(true);
})

let orDir = direction;
let toggledTheDir = document.getElementById("fixDir"); //interface controls the visual-default
function toggleDir() {
    if (toggledTheDir) {
        orDir = direction;
        direction = 0;
    } else {
        direction = orDir;
    }
    document.querySelector("label[for=showDir]").innerText = orDir.toFixed(4);
    document.querySelector("label[for=showDir2]").innerText = orDir.toFixed(1);
}
document.querySelector("#fixDir").addEventListener("input", function (e) {
    toggledTheDir = this.checked;
    toggleDir();
})

document.querySelector("#PUP").addEventListener("click", function (e) {
    const augment = function(count, delay) {
        const interval = setInterval(() => {
            incrementScore();
            addSnakeNode();
            if (--count <= 0) clearInterval(interval);
        }, delay);
        return interval;
    };
    augment(50, 50);
    // set and unset disabled
    this.disabled = true;
    setInterval(() => {
        this.disabled=false
    }, 2250)
    e.preventDefault();
})

function regeneratePellet() {
    pellet = pointFromSpherical(Math.random() * Math.PI * 2, Math.random() * Math.PI);
}

function pointFromSpherical(theta, phi) {
    var sinPhi = Math.sin(phi);
    return {
        x: Math.cos(theta) * sinPhi,
        y: Math.sin(theta) * sinPhi,
        z: Math.cos(phi)
    };
}

function copyPoint(src, dest) {
    if (!dest) dest = {};
    dest.x = src.x;
    dest.y = src.y;
    dest.z = src.z;
    return dest;
}

function addSnakeNode() {
    var snakeNode = {
        x: 0, y: 0, z: -1, posQueue: []
    };
    for (var i = 0; i < NODE_QUEUE_SIZE; i++) snakeNode.posQueue.push(null);
    if (snake.length > 0) {
        // Position the new node "behind" the last node.
        var last = snake[snake.length-1];
        var lastPos = last.posQueue[NODE_QUEUE_SIZE - 1];

        // TODO: if nodes are added too quickly (possible if snake collides with two
        // pellets quickly) then this doesn't look natural.

        // If the last node doesn't yet have a full history the default is
        // to rotate along starting direction.
        if (lastPos === null) {
            copyPoint(last, snakeNode);
            rotateZ(-STARTING_DIRECTION, snakeNode);
            rotateY(-NODE_ANGLE * 2, snakeNode);
            rotateZ(STARTING_DIRECTION, snakeNode);
        } else {
            copyPoint(lastPos, snakeNode);
        }
    }
    snake.push(snakeNode);
}

function incrementScore() {
    score += 1;
    document.querySelector("#score").innerHTML = "Score: " + score;
}

function allPoints() {
    var allPoints = [pellet].concat(points).concat(snake);
    for (var i = 0; i < snake.length; i++)
        allPoints = allPoints.concat(snake[i].posQueue);
    return allPoints;
}

function init() {
    cnv = document.getElementsByTagName('canvas')[0];
    ctx = cnv.getContext('2d');
    width = cnv.width;
    height = cnv.height;
    centerX = width / 2;
    centerY = height / 2;
    points = [];
    clock = Date.now();
    leftDown = false;
    rightDown = false;
    regeneratePellet();

    // The +1 is necessary since the queue excludes the current position.
    snakeVelocity = NODE_ANGLE * 2 / (NODE_QUEUE_SIZE + 1);
    var n = 40;
    for (var i = 0; i < n; i++) {
        for (var j = 0; j < n; j++) {
            points.push(
                pointFromSpherical(i / n * Math.PI * 2, j / n * Math.PI));
        }
    }
    snake = [];
    for (var i = 0; i < 8; i++) addSnakeNode();

    window.requestAnimationFrame(update);
}

function update() {
    if (stopped) return;
    var curr = Date.now();
    var delta = curr - clock;
    clock = curr;

    accumulatedDelta += delta;
    var targetDelta = 15;
    if (accumulatedDelta > targetDelta * 4) {
        // Cap the accumulated delta. Avoid an unbounded number of updates. Slow down game.
        accumulatedDelta = targetDelta * 4;
    }

    while (accumulatedDelta >= targetDelta) {
        accumulatedDelta -= targetDelta;
        checkCollisions();
        
        if (leftDown) direction -= .08;
        if (rightDown) direction += .08;
        document.getElementById("showDir").value = direction;

        applySnakeRotation();
        rotateZ(-direction);
        rotateY(-snakeVelocity);
        rotateZ(direction);
    }
    render();
    if (PAUSED) {
        //block the animationframe
        return
    } else {
        window.requestAnimationFrame(update);
    }
}

// Radius is given in angle and is drawn based on depth.
function drawPoint(point, radius, red) {
    var p = copyPoint(point);

    // Translate so that sphere origin is (0, 0, 2).
    p.z += 2;

    // This orients it so z axis is more negative the closer to you it is,
    // the x axis is to negative to the right, and the y axis is positive up.

    // Project.
    p.x *= -1 * focalLength / p.z;
    p.y *= -1 * focalLength / p.z;
    radius *= focalLength / p.z;

    p.x += centerX;
    p.y += centerY;

    ctx.beginPath();

    // Transparent based on depth.
    var alpha = 1 - (p.z - 1) / 2;
    // Color based on depth.
    var depthColor = 255 - Math.floor((p.z - 1) / 2 * 255);
    ctx.fillStyle = "rgba(" + red + ", 0, " + depthColor + ", " + alpha + ")";
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
}

function render() {
    ctx.clearRect(0, 0, width, height);
    for(var i = 0; i < points.length; i++) {
        drawPoint(points[i], 1 / 250, 0);
    }
    for (var i = 0; i < snake.length; i++) {
        drawPoint(snake[i], NODE_ANGLE, 120);
    }

    drawPoint(pellet, NODE_ANGLE, 0);

    // Draw angle.
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    var r = NODE_ANGLE / 2 * focalLength * 2.2;
    ctx.lineTo(centerX + Math.cos(direction) * r,
        centerY + Math.sin(direction) * r);
    ctx.strokeStyle = "#FFF";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.lineWidth = 1;


    // Draw circle.
    ctx.beginPath();
    ctx.strokeStyle = "#AAA";

    // The radius value was determined experimentally; and then further tweaked manually.
    ctx.arc(centerX, centerY, .53 * focalLength, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgb(10,10, 10)";
    ctx.beginPath();
    // ctx.arc(centerX, centerY, .58 * focalLength, 0, Math.PI * 2); //original "calculation"
    // ctx.stroke();
    // ctx.beginPath();
    ctx.arc(centerX, centerY, .60009 * focalLength, 0, Math.PI * 2);
    ctx.stroke();
}

// If pt is not provided, rotate all points.
function rotateZ(a, pt) {
    // Compute necessary rotation matrix.
    var cosA = Math.cos(a),
        sinA = Math.sin(a);

    var inPoints = [pt];
    if (!pt) inPoints = allPoints();
    for(var i = 0; i < inPoints.length; i++) {
        if (!inPoints[i]) continue;
        var x = inPoints[i].x,
            y = inPoints[i].y;
        inPoints[i].x = cosA * x - sinA * y;
        inPoints[i].y = sinA * x + cosA * y;
    }
}

function rotateY(a, pt) {
    // Compute necessary rotation matrix.
    var cosA = Math.cos(a),
        sinA = Math.sin(a);

    var inPoints = [pt];
    if (!pt) inPoints = allPoints();

    for(var i = 0; i < inPoints.length; i++) {
        if (!inPoints[i]) continue;
        var x = inPoints[i].x,
            z = inPoints[i].z;
        inPoints[i].x = cosA * x + sinA * z;
        inPoints[i].z = - sinA * x + cosA * z;
    }
}

function applySnakeRotation() {
    var nextPosition = null;
    for (var i = 0; i < snake.length; i++) {
        var oldPosition = copyPoint(snake[i]); 
        if (i == 0) {
            // Move head in current direction.
            rotateZ(-direction, snake[i]);
            rotateY(snakeVelocity, snake[i]);
            rotateZ(direction, snake[i]);
        } else if (nextPosition === null) {
            // History isn't available yet.
            rotateZ(-STARTING_DIRECTION, snake[i]);
            rotateY(snakeVelocity, snake[i]);
            rotateZ(STARTING_DIRECTION, snake[i]);
        } else {
            copyPoint(nextPosition, snake[i]);
        }

        snake[i].posQueue.unshift(oldPosition);
        nextPosition = snake[i].posQueue.pop();
    }
}

function collision(a,b) {
    var dist = Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2));
    return dist < collisionDistance; 
}

function checkCollisions() {
    for (var i = 2; i < snake.length; i++) {
         if (collision(snake[0], snake[i])) {
             showEnd();
             leaderboard.setScore(score);
             return;
         }
    }
    if (collision(snake[0], pellet)) {
        regeneratePellet();
        addSnakeNode();
        incrementScore();
    }
}

function showEnd() {
    // document.getElementsByTagName('body')[0].style = 'background: #E8E8E8';
    document.getElementById('gg').style = 'display:block';
    stopped = true;
}

function delBanners() {
    document.getElementById('gg').style = 'display:none';
    document.getElementById('paused').style = 'display:none';
}

init();
