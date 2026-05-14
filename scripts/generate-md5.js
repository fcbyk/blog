import readline from 'readline';
import crypto from 'crypto';

// 创建 readline 接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 隐藏输入的工具函数
function questionHidden(rl, query) {
  return new Promise((resolve) => {
    // 隐藏输入
    const stdin = process.stdin;
    const listeners = stdin.listeners('data');
    
    // 移除所有 data 监听器
    stdin.removeAllListeners('data');
    
    let result = '';
    
    // 添加自定义监听器来隐藏输入
    stdin.on('data', (chunk) => {
      if (chunk.toString() === '\n' || chunk.toString() === '\r') {
        // 恢复原始监听器
        listeners.forEach(listener => stdin.on('data', listener));
        rl.write('\n');
        resolve(result);
        return;
      }
      
      if (chunk.toString() === '\u0003') {
        // Ctrl+C
        listeners.forEach(listener => stdin.on('data', listener));
        rl.write('\n');
        process.exit(0);
      }
      
      result += chunk;
      rl.write('*');
    });
    
    rl.question(query, () => {});
  });
}

// 计算 MD5
function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

async function main() {
  console.log('\n🔐 MD5 密码生成工具\n');
  console.log('提示：输入时不会显示字符（以 * 代替）\n');
  
  try {
    // 获取用户名
    const username = await new Promise((resolve) => {
      rl.question('请输入用户名: ', (answer) => {
        resolve(answer.trim());
      });
    });
    
    if (!username) {
      console.log('\n❌ 用户名不能为空！\n');
      rl.close();
      return;
    }
    
    // 获取密码（隐藏输入）
    const password = await questionHidden(rl, '请输入密码: ');
    
    if (!password) {
      console.log('\n❌ 密码不能为空！\n');
      rl.close();
      return;
    }
    
    // 计算 MD5
    const usernameMd5 = md5(username);
    const passwordMd5 = md5(password);
    
    console.log('\n✅ 生成成功！\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 请复制以下内容到 .env 文件：\n');
    console.log(`NUXT_ADMIN_USERNAME=${usernameMd5}`);
    console.log(`NUXT_ADMIN_PASSWORD=${passwordMd5}`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('💡 提示：');
    console.log(`   - 用户名 "${username}" 的 MD5: ${usernameMd5}`);
    console.log(`   - 密码已加密为 MD5 格式`);
    console.log('   - 请将上述配置添加到项目根目录的 .env 文件中\n');
    
  } catch (error) {
    console.error('\n❌ 发生错误:', error.message);
  } finally {
    rl.close();
  }
}

main();
