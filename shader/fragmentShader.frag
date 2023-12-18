
#ifdef GL_ES
precision lowp float;
#endif
uniform vec2 u_resolution;
uniform int u_numPlanets;

const int maxNumPlanets = 50;//最多渲染行星个数
struct Planet {
    vec3 color;
    vec2 position;
    float radius;//影响亮度，亮度与半径的平方成正比
};

uniform Planet u_planets[maxNumPlanets];

void main() {
    float screenRatio = u_resolution.x / u_resolution.y; 

    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    st.x *= screenRatio;

    vec3 totalBrightness = vec3(0.0,0.0,0.0);
	

    // 迭代处理每个行星
	vec2 center;
	float brightness;
	
    for (int i = 0; i < maxNumPlanets; i++) {
        if (i >= u_numPlanets) {
            break;
        }
		center = u_planets[i].position.xy;
		center.x *= screenRatio;
        brightness = 0.002 / length(st - center) * u_planets[i].radius;//效果更好
        //brightness = 0.0001 / (length(st - center)*length(st - center)) * u_planets[i].radius;
        totalBrightness += brightness*u_planets[i].color;
    }

    // 将所有行星的光晕效果相加
    gl_FragColor = vec4(totalBrightness, 1.0);
}
