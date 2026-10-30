// Lightweight software projection of the same Three.js scene for devices without WebGL.
export function createCanvasRenderer(T, canvas) {
  const context=canvas.getContext('2d',{alpha:false});
  if(!context)throw new Error('No hay un contexto de dibujo disponible.');
  let width=1,height=1;
  const cache=new WeakMap(),viewProjection=new T.Matrix4(),modelView=new T.Matrix4(),instance=new T.Matrix4(),worldMatrix=new T.Matrix4();
  const vector=new T.Vector4(), light=new T.Vector3(-.5,.8,-.4).normalize();
  const faceNormal=new T.Vector3(),ab=new T.Vector3(),ac=new T.Vector3();
  const renderer={
    shadowMap:{},
    setPixelRatio(){},
    setSize(w,h){const ratio=Math.min(1,1100/w);width=Math.round(w*ratio);height=Math.round(h*ratio);canvas.width=width;canvas.height=height;},
    dispose(){cache.clear?.();},
    render(scene,camera){
      scene.updateMatrixWorld();camera.updateMatrixWorld();
      viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
      const gradient=context.createLinearGradient(0,0,0,height);gradient.addColorStop(0,'#191923');gradient.addColorStop(.58,'#70454b');gradient.addColorStop(1,'#302b34');
      context.fillStyle=gradient;context.fillRect(0,0,width,height);
      const commands=[];
      const enqueue=(o,matrix)=>{
        let shape=cache.get(o.geometry);
        if(!shape){
          const attr=o.geometry.attributes.position,unique=[],map=new Map();
          for(let i=0;i<attr.count;i++){
            const p=[attr.getX(i),attr.getY(i),attr.getZ(i)];const key=p.map(n=>n.toFixed(4)).join(',');
            if(!map.has(key)){map.set(key,unique.length);unique.push(p);}
          }
          const indices=o.geometry.index,triangles=[],count=indices?.count||attr.count;
          for(let i=0;i<count;i+=3){
            const face=[];for(let j=0;j<3;j++){const v=indices?indices.getX(i+j):i+j;face.push(map.get([attr.getX(v),attr.getY(v),attr.getZ(v)].map(n=>n.toFixed(4)).join(',')));}
            triangles.push(face);
          }
          shape={unique,triangles};cache.set(o.geometry,shape);
        }
        modelView.multiplyMatrices(camera.matrixWorldInverse,matrix);
        const center=new T.Vector3().setFromMatrixPosition(modelView);
        if(center.z>3||center.z< -200)return;
        const projected=[],worldPoints=[],depths=[];const ve=camera.matrixWorldInverse.elements;
        let valid=0;
        for(const p of shape.unique){
          vector.set(p[0],p[1],p[2],1).applyMatrix4(matrix);worldPoints.push(new T.Vector3(vector.x,vector.y,vector.z));depths.push(ve[2]*vector.x+ve[6]*vector.y+ve[10]*vector.z+ve[14]);
          vector.applyMatrix4(viewProjection);
          if(vector.w>.08){valid++;projected.push([(vector.x/vector.w*.5+.5)*width,(-vector.y/vector.w*.5+.5)*height]);}else projected.push(null);
        }
        if(!valid)return;
        const xs=projected.filter(Boolean).map(p=>p[0]),ys=projected.filter(Boolean).map(p=>p[1]);
        if(Math.max(...xs)<0||Math.min(...xs)>width||Math.max(...ys)<0||Math.min(...ys)>height)return;
        const material=Array.isArray(o.material)?o.material[0]:o.material;
        if(material.map?.image && projected.length===4 && projected.every(Boolean)) {
          const image=material.map.image;
          commands.push({depth:center.z,image,points:[projected[0],projected[1],projected[3],projected[2]],opacity:(material.opacity??1)*(1-Math.min(.6,Math.max(0,-center.z)*.004))});
          return;
        }
        if(!material.color)return;
        // Convert the working linear colour to the museum's subdued sRGB palette.
        const color=material.color.clone().convertLinearToSRGB();
        const fog=1-Math.exp(-Math.pow(Math.max(0,-center.z)*.012,2));
        const faces=[];
        for(const [a,b,c] of shape.triangles){
          const pa=projected[a],pb=projected[b],pc=projected[c];if(!pa||!pb||!pc)continue;
          const area=(pb[0]-pa[0])*(pc[1]-pa[1])-(pb[1]-pa[1])*(pc[0]-pa[0]);if(area>=0)continue;
          ab.subVectors(worldPoints[b],worldPoints[a]);ac.subVectors(worldPoints[c],worldPoints[a]);faceNormal.crossVectors(ab,ac).normalize();
          const shade=.6+Math.max(0,faceNormal.dot(light))*.5;
          const channels=[color.r,color.g,color.b].map((v,i)=>Math.round(Math.min(255,v*255*shade)*(1-fog)+[83,57,63][i]*fog));
          faces.push({points:[pa,pb,pc],fill:`rgb(${channels.join(',')})`,depth:(depths[a]+depths[b]+depths[c])/3});
        }
        for(const face of faces)commands.push({depth:face.depth,faces:[face],opacity:material.opacity??1});
      };
      scene.traverseVisible(o=>{
        if(!o.isMesh||o.material?.isShaderMaterial)return;
        if(o.isInstancedMesh){for(let i=0;i<o.count;i++){o.getMatrixAt(i,instance);worldMatrix.multiplyMatrices(o.matrixWorld,instance);enqueue(o,worldMatrix);}}
        else enqueue(o,o.matrixWorld);
      });
      commands.sort((a,b)=>a.depth-b.depth);
      for(const command of commands){
        context.globalAlpha=command.opacity;
        if(command.image){
          const [a,b,c,d]=command.points,iw=command.image.width,ih=command.image.height;
          for(let triangle=0;triangle<2;triangle++){
            context.save();context.beginPath();context.moveTo(a[0],a[1]);
            if(triangle===0){context.lineTo(b[0],b[1]);context.lineTo(c[0],c[1]);}
            else{context.lineTo(c[0],c[1]);context.lineTo(d[0],d[1]);}
            context.closePath();context.clip();
            if(triangle===0)context.setTransform((b[0]-a[0])/iw,(b[1]-a[1])/iw,(c[0]-b[0])/ih,(c[1]-b[1])/ih,a[0],a[1]);
            else context.setTransform((c[0]-d[0])/iw,(c[1]-d[1])/iw,(d[0]-a[0])/ih,(d[1]-a[1])/ih,a[0],a[1]);
            context.drawImage(command.image,0,0);context.restore();
          }
        } else for(const face of command.faces){
          const [a,b,c]=face.points;context.beginPath();context.moveTo(a[0],a[1]);context.lineTo(b[0],b[1]);context.lineTo(c[0],c[1]);context.closePath();context.fillStyle=face.fill;context.fill();
        }
      }
      context.globalAlpha=1;
    }
  };
  return renderer;
}
