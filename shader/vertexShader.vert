precision lowp float;
//设定画面精确度为高

attribute vec3 aPosition;
// 接收P5.js传入的形状参数。attribute是一种变数。有多少个锚点Vertex Shader就要跑多少次，而每一次attribute变数的数值都会不一样
// vec3 是一种型别，能储存三个float的值，其他像是vec2能储存两个值, vex4则能储存四个值
void main() {
    // 程序进入点
    vec4 positionVec4 = vec4(aPosition, 1.0);
    // 建立一个能储存四个值的锚点，将aPosition的三个值当做positionVec4的前三个值，第四个值为1.0
    positionVec4.xy = positionVec4.xy * 2.0 - 1.0;
    // gl_Position 是终点，代表每个锚点应该要在哪个位置呈现
    gl_Position = positionVec4;
}