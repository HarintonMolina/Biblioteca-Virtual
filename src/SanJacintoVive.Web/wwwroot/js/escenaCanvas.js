// Software projection with a depth buffer for devices without WebGL.
export function createCanvasRenderer(T, canvas) {
  const context=canvas.getContext('2d',{alpha:false});
  if(!context)throw new Error('No hay un contexto de dibujo disponible.');
  let width=1,height=1;
  const geometryCache=new WeakMap(),textureCache=new WeakMap();
  const vp=new T.Matrix4(),mv=new T.Matrix4(),instance=new T.Matrix4(),matrix=new T.Matrix4();
  const vector=new T.Vector4(),light=new T.Vector3(-.5,.8,-.4).normalize();
  const normal=new T.Vector3(),ab=new T.Vector3(),ac=new T.Vector3();
  function shapeFor(geometry) {
    if(geometryCache.has(geometry))return geometryCache.get(geometry);
    const attr=geometry.attributes.position,vertices=[],map=new Map(),indices=[];
    for(let i=0;i<attr.count;i++){
      const p=[attr.getX(i),attr.getY(i),attr.getZ(i)],key=p.map(n=>n.toFixed(4)).join(',');
      if(!map.has(key)){map.set(key,vertices.length);vertices.push(p);}indices.push(map.get(key));
    }
    const ix=geometry.index,triangles=[],count=ix?.count||attr.count;
    for(let i=0;i<count;i+=3)triangles.push([0,1,2].map(j=>indices[ix?ix.getX(i+j):i+j]));
    const result={vertices,triangles};geometryCache.set(geometry,result);return result;
  }
  function textureFor(image) {
    if(textureCache.has(image))return textureCache.get(image);
    const c=document.createElement('canvas');c.width=image.width;c.height=image.height;
    const cx=c.getContext('2d',{willReadFrequently:true});cx.drawImage(image,0,0);
    const result={width:c.width,height:c.height,data:cx.getImageData(0,0,c.width,c.height).data};
    textureCache.set(image,result);return result;
  }
  const renderer={
    shadowMap:{},setPixelRatio(){},dispose(){},
    setSize(w,h){const ratio=Math.min(1,960/w);width=Math.max(1,Math.round(w*ratio));height=Math.max(1,Math.round(h*ratio));canvas.width=width;canvas.height=height;},
    render(scene,camera){
      scene.updateMatrixWorld();camera.updateMatrixWorld();vp.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
      const background=context.createLinearGradient(0,0,0,height);background.addColorStop(0,'#191923');background.addColorStop(.58,'#70454b');background.addColorStop(1,'#302b34');context.fillStyle=background;context.fillRect(0,0,width,height);
      const frame=context.getImageData(0,0,width,height),pixels=frame.data,depthBuffer=new Float32Array(width*height);depthBuffer.fill(Infinity);
      const opaque=[],layers=[],ve=camera.matrixWorldInverse.elements;
      function enqueue(o,transform){
        const material=Array.isArray(o.material)?o.material[0]:o.material;
        if(!material?.color||material.opacity===0)return;
        mv.multiplyMatrices(camera.matrixWorldInverse,transform);
        const center=new T.Vector3().setFromMatrixPosition(mv);if(center.z>3||center.z< -210)return;
        const shape=shapeFor(o.geometry),projected=[],world=[];let valid=0;
        for(const p of shape.vertices){
          vector.set(p[0],p[1],p[2],1).applyMatrix4(transform);
          const wp=new T.Vector3(vector.x,vector.y,vector.z);world.push(wp);
          const distance=-(ve[2]*vector.x+ve[6]*vector.y+ve[10]*vector.z+ve[14]);
          vector.applyMatrix4(vp);
          if(vector.w>.08){valid++;projected.push([(vector.x/vector.w*.5+.5)*width,(-vector.y/vector.w*.5+.5)*height,distance]);}else projected.push(null);
        }
        if(!valid)return;
        const visible=projected.filter(Boolean),xs=visible.map(p=>p[0]),ys=visible.map(p=>p[1]);
        if(Math.max(...xs)<0||Math.min(...xs)>width||Math.max(...ys)<0||Math.min(...ys)>height)return;
        if(material.map?.image&&projected.length===4&&projected.every(Boolean)){
          layers.push({depth:center.z,points:[projected[0],projected[1],projected[3],projected[2]],texture:textureFor(material.map.image),opacity:(material.opacity??1)*(1-Math.min(.55,Math.max(0,-center.z)*.003))});return;
        }
        const color=material.color.clone().convertLinearToSRGB();
        const fog=1-Math.exp(-Math.pow(Math.max(0,-center.z)*.012,2));
        for(const [a,b,c] of shape.triangles){
          const pa=projected[a],pb=projected[b],pc=projected[c];if(!pa||!pb||!pc)continue;
          const area=(pb[0]-pa[0])*(pc[1]-pa[1])-(pb[1]-pa[1])*(pc[0]-pa[0]);if(area>=0)continue;
          ab.subVectors(world[b],world[a]);ac.subVectors(world[c],world[a]);normal.crossVectors(ab,ac).normalize();
          const shade=.6+Math.max(0,normal.dot(light))*.5;
          const rgb=[color.r,color.g,color.b].map((v,i)=>Math.min(255,v*255*shade)*(1-fog)+[83,57,63][i]*fog);
          opaque.push({points:[pa,pb,pc],rgb});
        }
      }
      scene.traverseVisible(o=>{
        if(!o.isMesh||o.material?.isShaderMaterial)return;
        if(o.isInstancedMesh){for(let i=0;i<o.count;i++){o.getMatrixAt(i,instance);matrix.multiplyMatrices(o.matrixWorld,instance);enqueue(o,matrix);}}
        else enqueue(o,o.matrixWorld);
      });
      function triangle(points,draw){
        const [a,b,c]=points;
        const minX=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),maxX=Math.min(width-1,Math.ceil(Math.max(a[0],b[0],c[0])));
        const minY=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),maxY=Math.min(height-1,Math.ceil(Math.max(a[1],b[1],c[1])));
        const denominator=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(denominator)<.001)return;
        const ax=(b[1]-c[1])/denominator,ay=(c[0]-b[0])/denominator;
        const bx=(c[1]-a[1])/denominator,by=(a[0]-c[0])/denominator;
        for(let y=minY;y<=maxY;y++){
          let wa=ax*(minX+.5-c[0])+ay*(y+.5-c[1]),wb=bx*(minX+.5-c[0])+by*(y+.5-c[1]);
          for(let x=minX;x<=maxX;x++,wa+=ax,wb+=bx){
            const wc=1-wa-wb;if(wa<0||wb<0||wc<0)continue;
            const inverse=wa/a[2]+wb/b[2]+wc/c[2];if(inverse<=0)continue;
            const z=1/inverse,at=y*width+x;if(z>depthBuffer[at]+.015)continue;
            draw(at,wa,wb,wc,z,inverse);
          }
        }
      }
      for(const face of opaque)triangle(face.points,(at,a,b,c,z)=>{depthBuffer[at]=z;const i=at*4;pixels[i]=face.rgb[0];pixels[i+1]=face.rgb[1];pixels[i+2]=face.rgb[2];});
      layers.sort((a,b)=>a.depth-b.depth);
      for(const layer of layers){
        const tex=layer.texture,uv=[[0,0],[1,0],[1,1],[0,1]];
        for(const indices of [[0,1,2],[0,2,3]]){
          const pts=indices.map(i=>layer.points[i]),coords=indices.map(i=>uv[i]);
          triangle(pts,(at,wa,wb,wc,z,inverse)=>{
            const u=(wa*coords[0][0]/pts[0][2]+wb*coords[1][0]/pts[1][2]+wc*coords[2][0]/pts[2][2])/inverse;
            const v=(wa*coords[0][1]/pts[0][2]+wb*coords[1][1]/pts[1][2]+wc*coords[2][1]/pts[2][2])/inverse;
            const sx=Math.max(0,Math.min(tex.width-1,Math.floor(u*tex.width))),sy=Math.max(0,Math.min(tex.height-1,Math.floor(v*tex.height)));
            const source=(sy*tex.width+sx)*4,alpha=tex.data[source+3]/255*layer.opacity;if(alpha<.003)return;
            const dest=at*4,rest=1-alpha;pixels[dest]=tex.data[source]*alpha+pixels[dest]*rest;pixels[dest+1]=tex.data[source+1]*alpha+pixels[dest+1]*rest;pixels[dest+2]=tex.data[source+2]*alpha+pixels[dest+2]*rest;
          });
        }
      }
      context.putImageData(frame,0,0);
    }
  };
  return renderer;
}
