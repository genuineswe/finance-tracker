pipeline {
    agent any
    
    environment {
        DOCKER_IMAGE = 'genuineswe/finance-tracker-backend'
        DOCKER_CREDENTIALS_ID = 'docker-hub-credentials'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Install & CI (Test)') {
            steps {
                dir('backend') {
                    sh 'npm ci'
                    sh 'npm test'
                }
            }
        }
        
        stage('CD (Build Image)') {
            when {
                branch 'main'
            }
            steps {
                dir('backend') {
                    script {
                        // Build Docker image from backend directory
                        sh "docker build -t ${DOCKER_IMAGE}:${env.BUILD_ID} -t ${DOCKER_IMAGE}:latest -f Dockerfile.prod ."
                    }
                }
            }
        }
        
        stage('CD (Push Image)') {
            when {
                branch 'main'
            }
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: env.DOCKER_CREDENTIALS_ID, usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                        sh "echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin"
                        sh "docker push ${DOCKER_IMAGE}:${env.BUILD_ID}"
                        sh "docker push ${DOCKER_IMAGE}:latest"
                    }
                }
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed! Check logs.'
        }
    }
}
