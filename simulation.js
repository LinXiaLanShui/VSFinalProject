// sketch.js 文件中定义了一些全局变量和函数，其中 setup 和 draw 函数是 p5.js 提供的特殊函数，用于设置初始状态和在每一帧绘制画面。这两个函数的执行由 p5.js 引擎控制，而不是手动调用。

//定义对象
var sun; //不考虑自身运动的特殊“行星”
var planets = [] ;
var shoot; //发射器

//标记运行状态
var paused = true;//是否处于暂停运行状态
var shooting_mode = false;//是否处于可以鼠标发射模型

//定义鼠标选中对象
var selectingPlanet = null;//鼠标正在选中的行星
var selectingSun = null;//鼠标正在选中的太阳
var selectedObject = null;//上一个选中的对象（太阳或行星）或者当前选中的对象(如果存在)
var planteID  = 1; //行星编号

//设置背景
let backgroundImage; //设置背景图片
let trailLayer; // 轨迹图层

//设置参数
var sunMass = 100; 
var planetMass = 1; //范围一般为1-1000
var Gravity = 1000;
var epoch = 500; //每次p5.js函数调用draw()函数时，进行引力计算并更新参数的次数
var dt = 0.1/epoch; //微分时间 和epoch对应，dt小==>误差小, epoch大，卡顿

//DOM
var massInput;
var updateMassButton;
var eccentricityInput;
var updateEccentricityButton;
let checkbox;
let select;

//模型文件位置
modelName = "model_1.json";//保存的模型名称
loadjsonPath =  'model/twoStar.json';//加载的模型位置


function preload() {
	// 预加载背景图片
	backgroundImage = loadImage('./background.png');

	// 利用p5.js的函式"loadShader()"来从资料夹位置取得两个shader文件，并且compile
    haloShader = loadShader('./shader/vertexShader.vert', './shader/fragmentShader.frag');
}

function setup() {
	createCanvas(windowWidth, windowHeight);
	sun = new Sun(windowWidth/2, windowHeight/2, sunMass);
	shoot = new Shooter();

	/* 创建一个图层用于绘制轨迹 */
	trailLayer = createGraphics(width, height);
	
	// 创建一个图形对象
    graphicsLayer = createGraphics(windowWidth, windowHeight, WEBGL);

	/* 设置帧率 */
	// frameRate(120); 

	/* ------------------DOM---------------- */

	/* 更改质量 */
	massInput = createInput(planetMass);// 创建输入框
	massInput.size(50); // 设置输入框的宽度为 50 像素
	massInput.position(windowWidth - 55, height - 30); 
	updateMassButton = createButton('Update Mass');// 创建按钮
	updateMassButton.position(windowWidth - 155, height - 30);
	updateMassButton.mousePressed(updateMass);

	/* 更改离心率 */
	eccentricityInput = createInput('0');
	eccentricityInput.size(50); 
	eccentricityInput.position(windowWidth - 55, height - 55);
	updateEccentricityButton = createButton('Update e');
	updateEccentricityButton.position(windowWidth - 155, height - 55);
	updateEccentricityButton.mousePressed(updateEccentricityInput);0

	/* 更改速度 */
	velxInput = createInput('0');
	velxInput.size(30);
	velxInput.position(windowWidth - 115, height - 80); 
	updateVelxButton = createButton('v_x');
	updateVelxButton.position(windowWidth - 155, height - 80);
	updateVelxButton.mousePressed(updateVelx);
	velyInput = createInput();
	velyInput.size(30); 
	velyInput.position(windowWidth - 35, height - 80); 
	updateVelyButton = createButton('v_y');
	updateVelyButton.position(windowWidth - 75, height - 80);
	updateVelyButton.mousePressed(updateVely);

	/* 更改位置 */
	posxInput = createInput();
	posxInput.size(30); 
	posxInput.position(windowWidth - 115, height - 105); 
	updatePosxButton = createButton('p_x');
	updatePosxButton.position(windowWidth - 155, height - 105);
	updatePosxButton.mousePressed(updatePosx);
	posyInput = createInput(sun.pos.y);
	posyInput.size(30); 
	posyInput.position(windowWidth - 35, height - 105); 
	updatePosyButton = createButton('p_y');
	updatePosyButton.position(windowWidth - 75, height - 105);
	updatePosyButton.mousePressed(updatePosy);

	/* 创建是否为鼠标射击模式 */
	checkbox = createCheckbox('shooting', false);
	checkbox.style('color', '#000000');  // 设置文字颜色
	checkbox.style('background-color', '#ffffff');  // 设置背景颜色
  	checkbox.changed(updateCheckbox);
	checkbox.position(270, height - 30); 

	/* 创建 select 元素 */
	select = createSelect();
	select.position(40, 7);
	select.option('行星列表')
	select.changed(handleSelect);// 添加选择事件

	/* 重置行星为初速度，初始位置 */
	resetButton = createButton('reset');
	resetButton.position(120, 7);
	resetButton.mousePressed(function() {
		reset(selectedObject);
	});
	resetallButton = createButton('reset all');
	resetallButton.position(170, 7);
	resetallButton.mousePressed(resetAll);

	/* 更新行星初速度，初始位置 */
	updateInitButton = createButton('update');
	updateInitButton.position(250, 7);
	updateInitButton.mousePressed(function() {
		updateInit(selectedObject);
	});
	updateInitallButton = createButton('update all');
	updateInitallButton.position(310, 7);
	updateInitallButton.mousePressed(updateInitAll);

	/* 读取和保存文件 */
	saveModelButton = createButton('save');
	saveModelButton.position(400, 7);
	saveModelButton.mousePressed(saveModel);
	loadModelButton = createButton('load');
	loadModelButton.position(447, 7);
	loadModelButton.mousePressed(LoadModel);

	/* -----------------DOM------------------ */
}

function draw() {
	/* 显示图层 */
	blendMode(BLEND );
	background(backgroundImage);//显示背景图层
	image(trailLayer, 0, 0);// 显示轨迹图层
	
	if(!paused) {
		//删除超出范围的行星
		var to_splice = [];
		var bound = 50000;
		for (var i = 0; i < planets.length ; i++) {
			if ((planets[i].pos.x > bound) ||
				(planets[i].pos.x < (0-bound)) ||
				(planets[i].pos.y > bound) ||
				(planets[i].pos.y < (0-bound))) {
				append(to_splice, i);
			}
		}
		for (var i = 0; i < to_splice.length ; i++) {
			//删除行星对应的select选项
			let options = select.elt.options;
			for (let j = 0; j < options.length; j++) {
				if (options[j].text == planets[to_splice[i]].ID) {
				options[j].remove();
				break; 
				}
			}
			//删除行星
			planets.splice(to_splice[i], 1);

		}

		/* 多次计算行星之间的引力并且更新状态 */
		for (var k = 0; k < epoch; k++){
			/* 计算行星之间的引力 */
			for (var i = 0; i < planets.length; i++) {
				for (var j = 0; j < planets.length; j++) {
					if(i != j) {
						planets[i].orbit(planets[j]);
					}
				}
				if(sun !== null) planets[i].orbit(sun);//计算太阳对这个行星的万有引力
			}
			/* 更新行星位置和速度状态 */
			for (var i = 0; i < planets.length; i++) {
				planets[i].update();//更新行星位置和速度，重置加速度为0
				if(k===0)planets[i].draw();//绘制行星及其轨迹
			}
		}
	}else {
		// 显示 "Pause" 字样
        textSize(32);
        textAlign(CENTER, CENTER);
        fill(255);
        text("Paused...", width / 2, height/2 - 50);
		
		for (var i = 0; i < planets.length ; i++) {//绘制行星及其轨迹
			planets[i].draw();
		}
	}


	/* -------------渲染光晕---------------- */
	graphicsLayer.shader(haloShader);// 使用光晕着色器 每次渲染帧(frame)时套用Shader
	// 利用p5.js的rect()建立一个矩形，这个矩形将被shader拿來处理
	graphicsLayer.rect(0, 0, windowWidth, windowHeight);//不管设定多大，矩形都是整个画布大小
	// 传送参数給Shader
	haloShader.setUniform("u_resolution", [windowWidth, windowHeight]);//从左下角开始的矩形
	if(planets.length!==0){
		haloShader.setUniform('u_numPlanets', planets.length);
		// 传递行星数据给着色器
		for (let i = 0; i < planets.length; i++) {
			haloShader.setUniform(`u_planets[${i}].color`, [planets[i].R/255, planets[i].G/255, planets[i].B/255]);
			haloShader.setUniform(`u_planets[${i}].position`, [planets[i].pos.x/width * 2, 2 - planets[i].pos.y/height * 2]);
			haloShader.setUniform(`u_planets[${i}].radius`, planets[i].radius);
		}
	} 
	if(sun !== null){//太阳也用同样方式渲染
		haloShader.setUniform('u_numPlanets', planets.length + 1);
		haloShader.setUniform(`u_planets[${planets.length}].color`, [sun.R/255, sun.G/255, sun.B/255]);
		haloShader.setUniform(`u_planets[${planets.length}].position`, [sun.pos.x/width * 2, 2 - sun.pos.y/height * 2]);
		haloShader.setUniform(`u_planets[${planets.length}].radius`, sun.radius);

	}
	if(planets.length === 0 && sun === null) {
		haloShader.setUniform('u_numPlanets', 0);
	}
	graphicsLayer.resetShader();// 停止使用光晕着色器
	blendMode(ADD);
	image(graphicsLayer, 0, 0);

	/* 太阳存在则绘制太阳 */
	if(sun !== null) sun.draw();
	
	if(selectingPlanet === null && selectingSun === null){//选中状态禁用发射器
		/* 更新发射器状态并且绘制发射器 */
		shoot.update();
		shoot.draw();
	} 

	/* 显示选中的行星或者太阳的信息 */
	if (selectedObject !== null) {
		selectedObject.displayInfo();
	}

	// 在右上角显示鼠标坐标
	textAlign(RIGHT, TOP);
	textSize(16);
	fill(255); // 设置文本颜色为白色
	text('Mouse: ' + mouseX + ', ' + mouseY, width - 10, 10);

	// 在屏幕右上角显示帧率
	let currentFrameRate = frameRate();
	fill(255);
	textSize(16);
	textAlign(RIGHT, TOP);
	text("Frame Rate: " + currentFrameRate.toFixed(2), width - 10, 30);
}

function keyPressed() {
	if (key === " ") {
	  paused = !paused;//暂停或者停止暂停
	}
  
	/* 删除 行星或太阳 */
	if (key === "d" || key === "D") {//鼠标选中才能删除
		if (selectingPlanet !== null) {
			//删除select元素
			let options = select.elt.options;// 获取选项列表
			for (let i = 0; i < options.length; i++) {// 遍历选项列表，找到要删除的选项并移除
				if (options[i].text == selectingPlanet.ID) {
					options[i].remove();
					break; 
				}
			}
			//删除行星
			var selectedIndex = planets.indexOf(selectingPlanet);
			planets.splice(selectedIndex, 1);
			selectingPlanet = null;
			selectedObject = null;
		} else if(selectingSun !== null){
			sun = null;
			selectingSun = null;
			selectedObject = null;
		}
	}
}

function mouseClicked() {
	/* 用鼠标选中行星或者太阳 */
	selectingPlanet = null;
	selectingSun = null;
	for (var i = 0; i < planets.length; i++) {
		var d = dist(mouseX, mouseY, planets[i].pos.x, planets[i].pos.y);
		if (d < planets[i].radius) {
			selectingPlanet = planets[i];
			break;
		}
	}
	if(sun !== null) {	
		var d = dist(mouseX, mouseY, sun.pos.x, sun.pos.y);
		if (d < sun.radius) {
			selectingSun = sun;
		} 
	}

	if(selectingPlanet !== null){
		if(selectedObject !== null && selectedObject !== sun){//取消select 选中
			selectedObject.selectDom = false;
		}
		selectedObject = selectingPlanet;
		select.value(selectedObject.ID);

	} else if(selectingSun !== null){
		selectedObject = selectingSun;
		select.value("行星列表");//重置select
	}
}


function Shooter() {
	this.x1 = 0;//发射器起点
	this.y1 = 0;
	this.x2 = 0;//发射器终点
	this.y2 = 0;
	this.R = 0;//发射器颜色
	this.G = 0;
	this.B = 0;
	this.vel = 0;//发射器的初速度
	this.vel_x = 0;
	this.vel_y = 0;
	this.shooting=false;//标记是否处于鼠标发射模型
	this.c_shooting=false;//标记是否处于键盘发射模型(o键)
	this.touchKey=false;//用于避免重复触发键盘输入

	this.update = function() {

		/* 标准轨道发射器 */
		if((!this.shooting) && (keyIsPressed) && (key === "o" || key ==='O') && (!this.c_shooting) && (!this.touchKey) && sun !== null) {//有些变量是p5.js中已经定义
			this.c_shooting = true;
			this.touchKey = true;
			this.R = floor(random(255));
			this.G = floor(random(255));
			this.B = floor(random(255));
			this.vel = 0;
			this.vel_x = 0;
			this.vel_y = 0;

	
			this.x1 = mouseX;
			this.x2 = mouseX;
			this.y1 = sun.pos.y;
			this.vel = sqrt(Gravity * sunMass/(abs(sun.pos.x - mouseX)));//sqrt(G*M/R)
			this.vel_y = this.vel;
			this.y2 = this.y1 - (10 * this.vel_y);
		}
		if((!this.shooting) && (keyIsPressed) && (key === "o" || key==='O') && (this.c_shooting) && (!this.touchKey)) {
			this.touchKey = true;
			
			this.vel_y = -this.vel_y;
			this.y2 = this.y1 - (10 * this.vel_y);
		}//微调方向

		if((!this.shooting) && (keyIsPressed)  && (keyCode == ENTER) && (this.c_shooting) && (!this.touchKey)) {
			this.c_shooting = false;
			this.touchKey = true;

			append(planets, new Planet(this.x1, this.y1,this.vel_x,this.vel_y,this.R,this.G,this.B,planetMass,planteID,true,0));
			select.option(planteID);
			const selectElement = select.elt; // 获取 select 元素的底层 HTML 元素
			selectElement.options[selectElement.length - 1].style.color = `rgb(${this.R}, ${this.G}, ${this.B})`;
			planteID = planteID + 1;
		}//按下Enter确认行星

		if((!this.shooting) && (keyIsPressed)  && (keyCode == ESCAPE) && (this.c_shooting) && (!this.touchKey)) {
			this.c_shooting = false;
			this.touchKey = true;
		}//按下Esc取消发射器

		if (!keyIsPressed) {
			this.touchKey = false;
		}



		/* 鼠标发射器 */
		if(shooting_mode && (!this.shooting) && (mouseIsPressed) && (!this.c_shooting)) {
			this.shooting = true;
			this.x1 = mouseX;
			this.y1 = mouseY;
			this.R = floor(random(255));
			this.G = floor(random(255));
			this.B = floor(random(255));
		}

		if (shooting_mode && this.shooting && mouseIsPressed) {
			this.x2 = mouseX;
			this.y2 = mouseY;
			this.vel = int(dist(this.x1, this.y1, this.x2, this.y2))/10;
		}

		if (shooting_mode && !mouseIsPressed && this.shooting) {
			var alpha = 0;
			var x_dir = 0;
			var y_dir = 0;

			if (this.vel > 5) {
				if (this.x1 != this.x2) {
					alpha = atan(abs((this.y2 - this.y1)) / abs((this.x2 - this.x1)));
					this.vel_x = this.vel * cos(alpha);
					this.vel_y = this.vel * sin(alpha);
				} else {
					this.vel_x = 0;
					this.vel_y = this.vel;
				}	

				if (this.x2 < this.x1) {
					if(this.y2 < this.y1) {
						x_dir = 1;
						y_dir = 1;
					} else {
						x_dir = 1;
						y_dir = -1;
					}
				} else {
					if(this.y2 < this.y1) {
						x_dir = -1;
						y_dir = 1;
					} else {
						x_dir = -1;
						y_dir = -1;
					}
				}
				append(planets, new Planet(this.x2, this.y2, (x_dir * this.vel_x),(y_dir * this.vel_y),this.R,this.G,this.B,planetMass,planteID));
				select.option(planteID);
				const selectElement = select.elt; // 获取 select 元素的底层 HTML 元素
				selectElement.options[selectElement.length - 1].style.color = `rgb(${this.R}, ${this.G}, ${this.B})`;
				planteID = planteID + 1;
			}
			this.shooting = false;
		}
	}

	this.draw = function() {
			textSize(12);
			if ((this.shooting) || (this.c_shooting)) {
				/* Draw the line and the arraow */
				stroke(255);
				line(this.x1-5,this.y1, this.x1+5, this.y1);
				line(this.x1,this.y1-5, this.x1, this.y1+5);
				line(this.x1, this.y1, this.x2, this.y2);

				/* Draw the futur planet */
				noStroke();
				fill(this.R,this.G,this.B);
				ellipse(this.x2, this.y2, 10, 10);

				push();
				fill(255);
				translate( (this.x1+this.x2)/2, (this.y1+this.y2)/2 );
				if (this.x2 > this.x1) {
			        	rotate( atan2(this.y2-this.y1,this.x2-this.x1) );
				} else {
			        	rotate( atan2(this.y1-this.y2,this.x1-this.x2) );
				}
				text(nfc(this.vel,1,1), 0, -5);
				pop();
			}
	}
}

function Sun(x,y,mass) {
	this.pos = createVector(x, y);
	this.radius = 10;
	this.mass = mass;
	this.R = 255;
	this.G = 255;
	this.B = 255;

	this.draw = function() {
		fill(255);
		ellipse(this.pos.x, this.pos.y, this.radius*2, this.radius*2); 

		// 如果sun被选中
		if (selectingSun !== null) {
			/*绘制虚线框*/
			push();
			noFill();
			stroke(255);
			strokeWeight(1);
			ellipse(this.pos.x, this.pos.y, this.radius*2 + 10, this.radius*2 + 10);
			pop();
		}
	}

	this.displayInfo = function () {
		/* Display planet information */
		push(); 
		textSize(16);
		fill(255);
		textAlign(LEFT, TOP);
		text("Sun " , 10, 10);
		text("Mass: " + this.mass, 10, 30);
		text("Position: (" + nfc(this.pos.x, 1, 2) + ", " + nfc(this.pos.y, 1, 2) + ")", 10, 50);
		pop();
	  };
}

function Planet(x,y,velx,vely,R,G,B,mass,ID,standardOrbit=false,e=0) {
	this.R = R || 0;
	this.G = G || 0;
	this.B = B || 0;
	this.pos = createVector(x, y);
	this.vel = createVector(velx, vely);
	this.acc = createVector(0, 0);
	this.prevPos = createVector(0, 0);
	this.mass = mass;
	this.radius = 2.5 * Math.log10(this.mass) + 5;
	this.Gravity = Gravity;
	this.ID = ID;
	this.standardOrbit = standardOrbit;//是否为单恒星系统的按键以离心率为e的圆锥曲线标准发射 等价于 初速度满足垂直矢径
	this.e = e;//单恒星系统行星的离心率，单恒星系统才考虑这个参数,否则为无效参数
	this.pos_0 = createVector(x, y);//初始位置
	this.vel_0 = createVector(velx, vely);//初速度
	this.selectDom = false;//通过select来选中对象

	this.draw = function() {
		/* Draw planet */
		push(); // 保存当前画布状态
		noStroke(); // 不绘制边框
		fill(255, 255, 255, 250); // 使用指定颜色填充，最后一个参数表示透明度
		translate(this.pos.x, this.pos.y); // 将坐标原点移动到行星位置
		rotate(this.vel.heading()); // 根据速度的方向进行旋转
		ellipse(0, 0, this.radius * 2, this.radius * 2); // 绘制行星，以当前位置为中心
		pop(); // 恢复之前保存的画布状态
	
		// 在轨迹图层上绘制轨迹
		trailLayer.stroke(this.R, this.G, this.B);
		if (!this.prevPos.equals(createVector(0, 0))) {
			trailLayer.strokeWeight(this.radius/100 + 0.8);
		  	trailLayer.line(this.prevPos.x, this.prevPos.y, this.pos.x, this.pos.y);//我不明白为什么两个图层的坐标尺量是不一样的，刚好还是2倍
		}

		// 如果行星被鼠标选中，或者被select选中
		if (selectingPlanet === this || this.selectDom) {
			/* 绘制虚线框 */
			push();
			noFill();
			stroke(255);
			strokeWeight(1);
			ellipse(this.pos.x, this.pos.y, this.radius * 2 + 20, this.radius * 2 + 20);
			pop();
		}

		// 可视化速度箭头
		push();
		translate(this.pos.x, this.pos.y);
		rotate(this.vel.heading());
		let arrowSize = this.vel.mag() * 10; // 箭头的长度等于速度的大小
		stroke(this.R, this.G, this.B); // 使用行星的颜色
		strokeWeight(2);
		fill(this.R, this.G, this.B); // 使用行星的颜色
		line(0, 0, arrowSize, 0);
		line(arrowSize, 0, arrowSize - 3, -3);
		line(arrowSize, 0, arrowSize - 3, 3);
		pop();

		/* //显示行星ID
		fill(255);
        textSize(12);
        textAlign(CENTER, CENTER);
        text(this.ID, this.pos.x, this.pos.y); */
	}

	this.applyForce = function(force) {
		this.acc.add(force.mult(1.0/this.mass));
	}

	this.update = function () {
		this.prevPos = this.pos;
		this.vel.add(p5.Vector.mult(this.acc, dt)); // 积分
		this.pos.add(p5.Vector.mult(this.vel, dt));
		this.acc.mult(0);
	}	

	this.orbit = function(body) {
		var gravity_force = 0; 
		var gravity_force_x = 0; 
		var gravity_force_y = 0; 
		var x_dir = 0;
		var y_dir = 0;
		var alpha =  0;


		/* Gravitational force */
		var g_dist = dist(this.pos.x,this.pos.y,body.pos.x,body.pos.y)
		gravity_force = ((this.Gravity * this.mass * body.mass)/(sq(g_dist)));
		if (body.pos.x != this.pos.x) {
			alpha = atan(abs((body.pos.y - this.pos.y)) / abs((body.pos.x - this.pos.x)));
			gravity_force_x = gravity_force * cos(alpha);
			gravity_force_y = gravity_force * sin(alpha);
		} else {
			gravity_force_x = 0;
			gravity_force_y = gravity_force;
		}	

		/* Gravitational force direction */
		if (this.pos.x < body.pos.x) {
			if(this.pos.y < body.pos.y) {
				x_dir = 1;
				y_dir = 1;
			} else {
				x_dir = 1;
				y_dir = -1;
			}
		} else {
			if(this.pos.y < body.pos.y) {
				x_dir = -1;
				y_dir = 1;
			} else {
				x_dir = -1;
				y_dir = -1;
			}
		}

		/* Apply gravitational force */
		this.applyForce(createVector((x_dir * gravity_force_x), (y_dir * gravity_force_y)));
	}

	this.displayInfo = function () {
		/* Display planet information */
		push(); 
		textSize(16);
		fill(this.R, this.G, this.B, 250);
		textAlign(LEFT, TOP);
		text("ID: ", 10, 10);
		text("Mass: " + this.mass, 10, 50);
		text("Speed: " + nfc(this.vel.mag(), 1, 2), 10, 70);
		text("Velocity: (" + nfc(this.vel.x, 1, 2) + ", " + nfc(this.vel.y, 1, 2) + ")", 10, 90);
		text("Position: (" + nfc(this.pos.x, 1, 2) + ", " + nfc(this.pos.y, 1, 2) + ")", 10, 110);
		text("初始位置: (" + nfc(this.pos_0.x, 1, 2) + ", " + nfc(this.pos_0.y, 1, 2) + ")", 10, 130);
		text("初速度: (" + nfc(this.vel_0.x, 1, 2) + ", " + nfc(this.vel_0.y, 1, 2) + ")", 10, 150);
		if(this.standardOrbit && sun !== null) {
			if(this.e === 0) text("标准轨迹: 圆",10,190);
			if(this.e < 1 && this.e > 0) text("标准轨迹: 椭圆",10,190);
			if(this.e === 1) text("标准轨迹: 抛物线",10,190);
			if(this.e > 1) text("标准轨迹: 双曲线",10,190)
			text("离心率: " + nfc(this.e, 2, 2), 10,210);
			var r0 = abs(sun.pos.x - this.pos_0.x);
			var v1 = sqrt(Gravity * sunMass/ r0);
			var v2 = sqrt(2 * Gravity * sunMass / r0);
			text("对于矢径 r0=" + nfc(r0,1) + " 临界初速度: v1=" + nfc(v1, 1) + " & v2="+ nfc(v2, 1), 10, 230);
		}
		pop();
	};
}



/*--------------------------------------DOM 函数------------------------------------ */
function emptyTrack(){
	trailLayer.clear();//清空轨迹图层所有轨迹
}

function deletePlanetSun(){//只要被行星被选择就可以删除，鼠标选择或者select框选择
    if (selectedObject !== null) {
		if(selectedObject === sun) {
			sun = null;
        	selectingSun = null;
			selectedObject = null;
		} else {
			let options = select.elt.options;// 获取选项列表
			for (let i = 0; i < options.length; i++) {// 遍历选项列表，找到要删除的选项并移除
				if (options[i].text == selectedObject.ID) {
				options[i].remove();
				break; 
				}
			}

			var selectedIndex = planets.indexOf(selectedObject);
			planets.splice(selectedIndex, 1);
			selectedObject = null;
			selectingPlanet = null;
		}
	}
}

function Pause(){
    paused = !paused
}

function updateMass() {//更新质量
	var newMass = float(massInput.value());// 将输入框的值转换为浮点数
	
	if (!isNaN(newMass) && selectedObject) {// 检查值的有效性，确保它是一个数  
		selectedObject.mass = newMass;
		selectedObject.radius = 2.5 * Math.log10(selectedObject.mass) + 5;
		if(selectedObject.radius <= 0) selectedObject.radius = 0.1
	}
}

function updateEccentricityInput() {//更新离心率
	var newEccentricity = float(eccentricityInput.value());// 将输入框的值转换为浮点数
	
	if (sun !== null && !isNaN(newEccentricity) && selectedObject && selectedObject!==sun && selectedObject.vel.x==0 && selectedObject.pos.y === sun.pos.y) {//满足条件才能更改离心率
		selectedObject.e = newEccentricity;
		var r0 = abs(selectedObject.pos.x - sun.pos.x);//矢径的模
		var c0_2 = (1 + selectedObject.e) * r0;//圆锥曲线的半正焦弦  若var c0_2 = (1 - selectedObject.e) * r0;时，且0 < e < 1时为小椭圆
		selectedObject.vel = createVector(0,
			sqrt(Gravity*sun.mass* (2/r0 + (sq(selectedObject.e)-1)/c0_2)));
		selectedObject.vel_0 = createVector(selectedObject.vel.x, selectedObject.vel.y);
	}
}

function updateVelx () {
	var newVelx = float(velxInput.value());
	if (!isNaN(newVelx) && selectedObject && selectedObject !== sun) {
		selectedObject.vel.x = newVelx;
		// if(newVelx !== 0)	selectedObject.standardOrbit = false;
	}
}

function updateVely () {
	var newVely = float(velyInput.value());
	if (!isNaN(newVely) && selectedObject && selectedObject !== sun) {
		selectedObject.vel.y = newVely;
	}
}

function updatePosx () {
	var newPosx = float(posxInput.value());
	if (!isNaN(newPosx) && selectedObject) {
		selectedObject.pos.x = newPosx;
	}
}

function updatePosy () {
	var newPosy = float(posyInput.value());
	if (!isNaN(newPosy) && selectedObject) {
		selectedObject.pos.y = newPosy;
	}
}

function updateCheckbox() {
	shoot.shooting = false;

	shooting_mode =!shooting_mode;
}

function handleSelect() {
	let selectedValue = select.value();
	
	for(var i = 0; i < planets.length; i++){
		if(planets[i].ID == selectedValue){
			planets[i].selectDom = true;
			if(selectedObject !== null && selectedObject !== sun){
				selectedObject.selectDom = false;
			}
			selectedObject = planets[i];
			selectingPlanet = planets[i];
		}
	}
	if(selectedValue == "行星列表") {
		if(selectedObject !== null && selectedObject !== sun){
			selectedObject.selectDom = false;
		}
	}
}

function reset (resetPlanet) {//重置行星
	if(resetPlanet === null) return;
	if(sun !== null && resetPlanet === sun) return; 
	
	resetPlanet.vel = resetPlanet.vel_0.copy();
	resetPlanet.pos = resetPlanet.pos_0.copy();
	resetPlanet.prevPos = createVector(0, 0);
	paused = true;
}

function resetAll () {//重置行星
	for(var i = 0; i < planets.length; i++) {
		reset(planets[i]);
	}
}

function updateInit (updateInitPlanet) {//重置行星
	if(updateInitPlanet === null) return;
	if(sun !== null && updateInitPlanet === sun) return; 
	
	updateInitPlanet.vel_0 = updateInitPlanet.vel.copy();
	updateInitPlanet.pos_0 = updateInitPlanet.pos.copy();
	updateInitPlanet.prevPos = createVector(0, 0);
}

function updateInitAll () {
	for(var i = 0; i < planets.length; i++) {
		updateInit(planets[i]);
	}
}

function saveModel () {
	let saveData = {
		sun: {},
		planets:{}
	};
	for(var i = 0; i < planets.length; i++) {
		var pla = {}
		pla.R = planets[i].R;
		pla.G = planets[i].G;
		pla.B = planets[i].B;
		pla.mass = planets[i].mass;
		pla.standarOrbit = planets[i].standardOrbit;
		pla.e = planets[i].e;
		pla.posx = planets[i].pos_0.x;
		pla.posy = planets[i].pos_0.y;
		pla.velx = planets[i].vel_0.x;
		pla.vely = planets[i].vel_0.y;
		pla.ID = planets[i].ID;
		saveData.planets[pla.ID] = pla;
	}
	if(sun === null) {
		saveData.sun = null;
	} else {
		saveData.sun.posx = sun.pos.x;
		saveData.sun.posy = sun.pos.y;
		saveData.sun.mass = sun.mass;
	}
	saveData.Gravity = Gravity;
	saveData.epoch = epoch;
	saveData.dt = dt;

	let jsonString = JSON.stringify(saveData);
	saveJSON(jsonString, modelName);
}

function LoadModel() {
	loadJSON(loadjsonPath, function(data) {
		let options = select.elt.options;// 获取选项列表
		for (let i= options.length - 1; i > 0; i--) {// 遍历选项列表，找到要删除的选项并移除
			options[i].remove();
		}

		console.log(data);
		loadData = JSON.parse(data);//不加上这个无法正常加载数据
		planets = [];
		sun = null;
		// 使用 for...in 遍历 JSON 对象的属性
		if(loadData.sun === null){
			sun = null;
		} else{
			sunMass = loadData.sun.mass;
			sun = new Sun(loadData.sun.posx, loadData.sun.posy, sunMass);
		}

		for (var id in loadData.planets) {
			if (loadData.planets.hasOwnProperty(id)) {
				append(planets, new Planet(
					loadData.planets[id].posx,
					loadData.planets[id].posy,
					loadData.planets[id].velx,
					loadData.planets[id].vely,
					loadData.planets[id].R,
					loadData.planets[id].G,
					loadData.planets[id].B,
					loadData.planets[id].mass,
					loadData.planets[id].ID,
					loadData.planets[id].standarOrbit,
					loadData.planets[id].e
				));
				select.option(int(id));
				const selectElement = select.elt; // 获取 select 元素的底层 HTML 元素
				selectElement.options[selectElement.length - 1].style.color =
				 `rgb(${loadData.planets[id].R},
					  ${loadData.planets[id].G},
					  ${loadData.planets[id].B})`;
				planteID = max(planteID,int(id));
			}
		}
		planteID = planteID + 1;

		Gravity = loadData.Gravity;
		epoch = loadData.epoch;
		dt = loadData.dt;
	});
}

function addPlanet(){
	window.alert("还未实现！意义不大")
}
/*--------------------------------------DOM 函数------------------------------------ */
