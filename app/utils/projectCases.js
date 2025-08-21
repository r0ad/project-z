// 项目案例库配置
export const projectCases = {
  // 技术开发类
  tech: {
    name: '技术开发',
    icon: 'service',
    color: '#165DFF',
    cases: [
      {
        name: 'AI小程序开发',
        goal: '30天内开发一款AI聊天小程序，实现智能对话功能，用户留存率达到60%',
        description: '开发一个基于大模型API的智能聊天小程序，包含用户注册登录、对话历史、个性化设置等功能。'
      },
      {
        name: '任务管理APP',
        goal: '45天内开发一个个人任务管理APP，支持GTD方法论，日活用户达到100人',
        description: '设计开发一个简洁高效的任务管理应用，支持项目分类、任务优先级、时间提醒、数据统计等功能。'
      },
      {
        name: '电商小程序',
        goal: '60天内开发一个商品展示小程序，实现在线下单功能，月GMV达到5万元',
        description: '开发包含商品展示、购物车、订单管理、支付功能的完整电商小程序，支持商家后台管理。'
      },
      {
        name: '数据可视化平台',
        goal: '40天内开发一个数据可视化平台，支持多种图表类型，用户满意度达到85%',
        description: '构建一个支持Excel导入、多维度数据分析、图表自定义的数据可视化平台。'
      }
    ]
  },
  
  // 学习成长类
  learning: {
    name: '学习成长',
    icon: 'star',
    color: '#FF6B35',
    cases: [
      {
        name: '前端技能提升',
        goal: '3个月内掌握Vue3+TypeScript技术栈，完成3个实战项目并获得高级前端offer',
        description: '系统学习Vue3生态、TypeScript、前端工程化，通过实战项目巩固技能，准备面试。'
      },
      {
        name: '英语口语突破',
        goal: '6个月内英语口语达到流利水平，能够进行30分钟英文技术分享',
        description: '通过每日练习、外教对话、技术文档阅读等方式提升英语口语和技术英语表达能力。'
      },
      {
        name: 'AI知识体系建设',
        goal: '4个月内建立完整的AI知识体系，掌握机器学习和深度学习核心概念',
        description: '系统学习AI基础理论、算法实现、实际应用，完成5个AI项目实战。'
      },
      {
        name: '产品经理转型',
        goal: '5个月内完成产品经理技能学习，获得产品岗位offer，薪资提升30%',
        description: '学习产品思维、用户研究、数据分析、项目管理等核心技能，积累产品作品集。'
      }
    ]
  },
  
  // 创业项目类
  startup: {
    name: '创业项目',
    icon: 'dongdong',
    color: '#00D68F',
    cases: [
      {
        name: '在线教育平台',
        goal: '6个月内搭建在线教育平台，获得1000名注册用户，月收入达到10万元',
        description: '开发包含课程管理、在线直播、作业批改、学习进度跟踪的完整在线教育解决方案。'
      },
      {
        name: 'SaaS工具开发',
        goal: '4个月内开发一款企业级SaaS工具，获得50家企业用户，ARR达到100万',
        description: '针对中小企业需求，开发一款提高工作效率的SaaS工具，包含多租户架构、权限管理等。'
      },
      {
        name: '短视频内容创业',
        goal: '3个月内打造个人IP，获得10万粉丝，月广告收入达到5万元',
        description: '围绕专业领域创作优质短视频内容，建立个人品牌，通过广告和付费内容变现。'
      },
      {
        name: '本地服务平台',
        goal: '8个月内开发本地生活服务平台，覆盖3个城市，月交易额达到50万',
        description: '开发连接本地商家和用户的服务平台，包含商家入驻、服务预约、评价系统等功能。'
      }
    ]
  },
  
  // 生活健康类
  lifestyle: {
    name: '生活健康',
    icon: 'heart',
    color: '#FF4757',
    cases: [
      {
        name: '健身计划挑战',
        goal: '3个月内减重10公斤，体脂率降到15%，完成首次马拉松比赛',
        description: '制定科学的健身和饮食计划，每周运动5次，记录身体数据变化，准备马拉松训练。'
      },
      {
        name: '阅读习惯养成',
        goal: '1年内阅读52本书，建立个人知识管理体系，写出50篇读书笔记',
        description: '每周阅读1本书，涵盖技术、管理、心理学等领域，建立读书笔记和知识图谱。'
      },
      {
        name: '理财投资规划',
        goal: '1年内建立完整投资组合，年化收益率达到15%，积累10万投资经验',
        description: '学习投资理财知识，分散配置股票、基金、债券等资产，记录投资决策和收益。'
      },
      {
        name: '摄影技能提升',
        goal: '6个月内掌握专业摄影技能，举办个人摄影展，获得摄影比赛奖项',
        description: '系统学习摄影理论和后期处理，每周拍摄练习，积累作品集，参与摄影社群。'
      }
    ]
  }
}

// 获取所有案例分类
export function getCaseCategories() {
  return Object.keys(projectCases).map(key => ({
    key,
    ...projectCases[key],
    cases: projectCases[key].cases.length
  }))
}

// 根据分类获取案例
export function getCasesByCategory(category) {
  return projectCases[category]?.cases || []
}

// 获取随机推荐案例
export function getRandomCases(count = 6) {
  const allCases = []
  Object.keys(projectCases).forEach(category => {
    projectCases[category].cases.forEach(caseItem => {
      allCases.push({
        ...caseItem,
        category,
        categoryName: projectCases[category].name,
        categoryColor: projectCases[category].color
      })
    })
  })
  
  // 随机打乱并返回指定数量
  const shuffled = allCases.sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}
