

const PROJECT_PREFIX = 'roomify_project_';

const jsonError = (status,message,extra = {})=>{
    return new Response(JSON.stringify({error:message,...extra}),{
        status,
        headers:{
            'Content-Type':'application/json',
            'Access-Control-Allow-Origin':'*'
        }
    })
}

const getUserId = async (userPuter) => {
    try {
        const user = await userPuter.getUser();
        console.log("Worker user (full):", JSON.stringify(user));

        const id = user?.uuid || user?.uid || user?.id || null;
        if (!id) {
            console.error("getUserId: user object had no usable id field", user);
        }
        return id;
    } catch (e) {
        console.error("getUserId threw:", e?.message || e, e?.stack);
        return null;
    }
};

router.post('/api/projects/save', async({request, user})=>{
    try {
        const userPuter = user.puter;

        if(!userPuter) return jsonError(401,'NO_PUTER');

        const body = await request.json();
        const project = body?.project;

        if(!project?.id || !project?.sourceImage) return jsonError(400,'Project not found.');

        const payload = {
            ...project,
            updatedAt: new Date().toISOString(),
        }

        const userId = await getUserId(userPuter);

        if(!userId) return jsonError(401,'NO_USER');

        const key = `${PROJECT_PREFIX}${project.id}`
        await userPuter.kv.set(key,payload);

        return {saved:true , id:project.id, project:payload};

    } catch (e) {
        return jsonError(500,'Failed to save project', {message:e.message || 'Unknown error'})
    }
})

router.get('/api/projects/list',async({user})=>{
    try {
        const userPuter = user.puter;
        if(!userPuter) return jsonError(401,'NO_PUTER');

        const userId = await getUserId(userPuter);
        if(!userId) return jsonError(401,'NO_USER');

        const projects = (await userPuter.kv.list(PROJECT_PREFIX,true))
        .map(({value})=>({...value,isPublic:true}));

        return {projects};
    } catch (e) {
        return jsonError(500,'Failed to list projects', {message:e.message || 'Unknown Error'});
    }
})

router.get('/api/projects/get', async({request, user})=>{
    try{
        const userPuter = user.puter;
        if(!userPuter) return jsonError(401,'NO_PUTER');
        
        const userId = await getUserId(userPuter);
        if(!userId) return jsonError(401,'NO_USER');

        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        if(!id) return jsonError(400,'Project ID is required.');

        const key = `${PROJECT_PREFIX}${id}`;
        const project = await userPuter.kv.get(key);

        if(!project) return jsonError(404,'Project not found.');

        return {project};
    }catch(e){
        return jsonError(500,'Failed to get project', {message:e.message || 'Unknown Error'});
    }
})